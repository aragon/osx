"""Regression coverage for source files that declare multiple contracts."""

import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location(
    "build_docs", Path(__file__).with_name("build-docs.py")
)
build_docs = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = build_docs
SPEC.loader.exec_module(build_docs)


class LoadContractsTests(unittest.TestCase):
    def test_each_contract_uses_its_own_artifact(self):
        nodes = [
            {
                "nodeType": "ContractDefinition",
                "id": index,
                "name": name,
                "linearizedBaseContracts": [index],
                "nodes": [],
            }
            for index, name in enumerate(("First", "Second"), 1)
        ]
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory)
            source = out / "Multiple.sol"
            source.mkdir()
            for name in ("First", "Second"):
                artifact = {
                    "ast": {"absolutePath": "src/Multiple.sol", "nodes": nodes},
                    "rawMetadata": json.dumps(
                        {"output": {"devdoc": {"details": name + " documentation"}}}
                    ),
                }
                (source / (name + ".json")).write_text(json.dumps(artifact))
            with patch.object(build_docs, "OUT_DIR", out):
                contracts = build_docs.load_all_contracts()
        self.assertEqual(set(contracts), {"First", "Second"})
        for name in ("First", "Second"):
            self.assertEqual(contracts[name].notice, name + " documentation")


if __name__ == "__main__":
    unittest.main()
