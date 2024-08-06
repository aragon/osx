abstract contract Executor {
    /// @notice Thrown if the action array length is larger than `MAX_ACTIONS`.
    error TooManyActions();

    uint256 internal constant MAX_ACTIONS = 256;

    function _validateActionsLength(uint256 length) internal virtual {
        if (length > MAX_ACTIONS) {
            revert TooManyActions();
        }
    }

    function _checkAction(
        uint256 allowFailureMap,
        uint256 failureMap,
        uint256 i,
        bool success,
        uint256 gasBefore,
        uint256 gasAfter
    ) internal virtual returns (uint256) {
        // Check if failure is allowed
        if (!hasBit(_allowFailureMap, uint8(i))) {
            // Check if the call failed.
            if (!success) {
                revert ActionFailed(i);
            }
        } else {
            // Check if the call failed.
            if (!success) {
                // Make sure that the action call did not fail because 63/64 of `gasleft()` was insufficient to execute the external call `.to.call` (see [ERC-150](https://eips.ethereum.org/EIPS/eip-150)).
                // In specific scenarios, i.e. proposal execution where the last action in the action array is allowed to fail, the account calling `execute` could force-fail this action by setting a gas limit
                // where 63/64 is insufficient causing the `.to.call` to fail, but where the remaining 1/64 gas are sufficient to successfully finish the `execute` call.
                if (gasAfter < gasBefore / 64) {
                    revert InsufficientGas();
                }

                // Store that this action failed.
                failureMap = flipBit(failureMap, uint8(i));
            }
        }

        return failureMap;
    }

    function _performCall(
        address _to,
        uint256 _value,
        bytes memory _data
    ) internal virtual returns (bool success, bytes memory result) {
        (success, result) = to.call{value: _value}(_data);
    }

    function _authorizeExecution() internal virtual {};

    function _preHook(Action[] calldata _actions, uint256 _allowFailureMap) internal virtual {}

    function _afterHook(
        Action[] calldata _actions,
        bytes[] memory _execResults,
        uint256 _failureMap
    ) internal virtual {}

    function execute(
        bytes32 _callId,
        Action[] calldata _actions,
        uint256 _allowFailureMap
    )
        external
        virtual
        override
        nonReentrant
        returns (bytes[] memory execResults, uint256 failureMap)
    {
        _authorizeExecution();

        // Check that the action array length is within bounds.
        _validateActionsLength(_actions.length);

        execResults = new bytes[](_actions.length);

        uint256 gasBefore;
        uint256 gasAfter;

        _preHook(actions);

        for (uint256 i = 0; i < _actions.length; ) {
            gasBefore = gasleft();

            (bool success, bytes memory result) = _performCall(_actions[i].to, _actions[i].data);

            gasAfter = gasleft();

            _checkAction(allowFailureMap, failureMap, i, success, gasBefore, gasAfter);

            execResults[i] = result;

            unchecked {
                ++i;
            }
        }

        _afterHook(actions, execResults, failureMap);

        emit Executed({
            actor: msg.sender,
            callId: _callId,
            actions: _actions,
            allowFailureMap: _allowFailureMap,
            failureMap: failureMap,
            execResults: execResults
        });
    }
}
