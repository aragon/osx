"""Regression tests for cross-section API documentation links."""

import tempfile
import unittest
import importlib.util
import sys
from pathlib import Path

BUILD_DOCS_PATH = Path(__file__).with_name("build-docs.py")
SPEC = importlib.util.spec_from_file_location("build_docs", BUILD_DOCS_PATH)
build_docs = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = build_docs
SPEC.loader.exec_module(build_docs)


class BuildDocsTests(unittest.TestCase):
    def test_framework_inherited_member_xref_targets_owning_section(self):
        permission_manager = build_docs.Contract(
            name="PermissionManager",
            source_path="src/core/permission/PermissionManager.sol",
            kind="contract",
        )
        plugin_repo = build_docs.Contract(
            name="PluginRepo",
            source_path="src/framework/plugin/repo/PluginRepo.sol",
            kind="contract",
            linearized_bases=["PluginRepo", "PermissionManager"],
            members=[
                build_docs.Member(
                    kind="function",
                    name="applyMultiTargetPermissions",
                    signature="applyMultiTargetPermissions(struct PermissionLib.MultiTargetPermission[])",
                    inputs=[
                        {
                            "type": "struct PermissionLib.MultiTargetPermission[]",
                            "name": "_items",
                        }
                    ],
                    outputs=[],
                    declared_in="PermissionManager",
                )
            ],
        )
        contracts = {
            "PermissionManager": permission_manager,
            "PluginRepo": plugin_repo,
        }

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            core_template = root / "core.adoc"
            framework_template = root / "framework.adoc"
            core_template.write_text("{{PermissionManager}}")
            framework_template.write_text("{{PluginRepo}}")
            templates = [(core_template, "core"), (framework_template, "framework")]
            contract_sections = build_docs.build_contract_sections(templates)

            framework = build_docs.render_template(
                framework_template,
                contracts,
                "framework",
                contract_sections,
            )

        anchor = (
            "PermissionManager-applyMultiTargetPermissions-"
            "struct-PermissionLib-MultiTargetPermission---"
        )
        self.assertIn(f":xref-{anchor}: xref:core.adoc#{anchor}", framework)
        self.assertNotIn(f"xref:framework.adoc#{anchor}", framework)


if __name__ == "__main__":
    unittest.main()
