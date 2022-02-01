import { defaultAbiCoder } from 'ethers/lib/utils';

export function createProposal(
    {actions, metadata, description, castVote, executeIfDecided}: 
    {actions?: any, metadata?: string, description?: string, castVote?: boolean, executeIfDecided?: boolean}
) {
    const proposal = {
        actions : actions || [],
        metadata: metadata || '0x',
        additionalArguments: defaultAbiCoder.encode([
            'string',
            'bool',
            'bool'
        ],[
            description || '0x',
            executeIfDecided || false,
            castVote || false,
        ])
    };

    return proposal;
}

export function createVoteData(supports: boolean, executeIfDecided: boolean) {
    return defaultAbiCoder.encode([
        'bool',
        'bool'
    ],[
        supports,
        executeIfDecided
    ]);
}
