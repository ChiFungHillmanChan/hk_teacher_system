#!/usr/bin/env python3
"""
CSS Duplicate Cleanup Script
Automatically cleans CSS duplicates based on priority structure and analysis results.
"""

import os
import re
import json
import shutil
from pathlib import Path
from typing import Dict, List, Set, Tuple
from datetime import datetime

class CSSCleanupTool:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.styles_dir = self.project_root / "styles"
        self.backup_dir = self.project_root / "css_backup"
        
        # Priority structure (1 = highest priority, 6 = lowest)
        self.priority_structure = {
            1: "base/",           # Global resets, tokens, typography - PRESERVE
            2: "components/",     # Shared components - PRESERVE when canonical
            3: "utilities/",      # Utility classes, animations - PRESERVE when canonical
            4: "layout/",         # Grid and structural layout - PRESERVE when canonical
            5: "features/",       # Specialized feature styling - TRIM/REMOVE duplicates
            6: "pages/"           # Page-specific overrides - REMOVE always when duplicated
        }
        
        # Variables to extract from duplicated long values
        self.variables_to_extract = {
            "repeat(auto-fit, minmax(200px, 1fr))": "--grid-auto-200",
            "repeat(auto-fit, minmax(250px, 1fr))": "--grid-auto-250", 
            "repeat(auto-fit, minmax(300px, 1fr))": "--grid-auto-300",
            "spin 1s linear infinite": "--animation-spin",
            "1px solid rgba(52, 152, 219, 0.2)": "--border-info-light",
            "1px solid rgba(52, 152, 219, 0.3)": "--border-info-medium",
            "rgba(243, 156, 18, 0.1)": "--color-warning-light-bg",
            "rgba(52, 152, 219, 0.1)": "--color-info-light-bg",
            "rgba(39, 174, 96, 0.05)": "--color-success-light-bg",
            "fadeIn 0.3s ease-in-out": "--animation-fade-in",
            "slideDown 0.3s ease-out": "--animation-slide-down"
        }
        
        # Color consolidation
        self.colors_to_consolidate = {
            "#229954": "--color-success-primary",
            "#3498db": "--color-info-primary", 
            "#ffffff": "--color-white-primary"
        }
        
        # Classes to remove completely from lower priority files
        self.safe_removal_classes = [
            ".p-4", ".p-3", ".p-6", ".p-8",  # Padding utilities
            ".transition-none", ".transition-all",  # Transition utilities
            ".hidden", ".block", ".flex",  # Display utilities
            ".text-center", ".text-left", ".text-right",  # Text alignment
            ".justify-center", ".justify-start", ".justify-between"  # Flexbox utilities
        ]

    def create_backup(self):
        """Create backup of CSS files before cleanup"""
        if self.backup_dir.exists():
            shutil.rmtree(self.backup_dir)
        
        print(f"Creating backup in {self.backup_dir}")
        shutil.copytree(self.styles_dir, self.backup_dir)
        
        # Create backup manifest
        manifest = {
            "backup_date": datetime.now().isoformat(),
            "original_structure": str(self.styles_dir),
            "backup_location": str(self.backup_dir)
        }
        
        with open(self.backup_dir / "backup_manifest.json", "w") as f:
            json.dump(manifest, f, indent=2)
        
        print("✅ Backup created successfully")

    def get_file_priority(self, file_path: Path) -> int:
        """Determine priority level of a CSS file based on its path"""
        relative_path = file_path.relative_to(self.styles_dir)
        path_str = str(relative_path)
        
        for priority, folder in self.priority_structure.items():
            if path_str.startswith(folder):
                return priority
        
        # Default to lowest priority if not in known structure
        return 6

    def extract_css_variables(self):
        """Extract duplicate long values to CSS variables"""
        print("\n🔧 Extracting CSS variables...")
        
        variables_file = self.styles_dir / "base" / "variables.css"
        
        # Read existing variables file
        if variables_file.exists():
            with open(variables_file, 'r') as f:
                content = f.read()
        else:
            content = "/* Auto-generated CSS variables from cleanup */\n:root {\n"
        
        # Add new variables
        new_variables = []
        for long_value, var_name in self.variables_to_extract.items():
            if var_name not in content:
                new_variables.append(f"  {var_name}: {long_value};")
        
        if new_variables:
            # Insert before closing :root
            if ":root {" in content:
                insert_pos = content.rfind("}")
                content = content[:insert_pos] + "\n  /* Extracted from duplicates */\n" + "\n".join(new_variables) + "\n" + content[insert_pos:]
            else:
                content += ":root {\n  /* Extracted from duplicates */\n" + "\n".join(new_variables) + "\n}\n"
            
            with open(variables_file, 'w') as f:
                f.write(content)
            
            print(f"✅ Added {len(new_variables)} variables to {variables_file}")
        
        return new_variables

    def consolidate_colors(self):
        """Consolidate duplicate color definitions"""
        print("\n🎨 Consolidating colors...")
        
        variables_file = self.styles_dir / "base" / "variables.css"
        
        if not variables_file.exists():
            return
        
        with open(variables_file, 'r') as f:
            content = f.read()
        
        consolidated = 0
        for color_value, var_name in self.colors_to_consolidate.items():
            if var_name not in content:
                # Add to variables if not present
                insert_pos = content.rfind("}")
                content = content[:insert_pos] + f"  {var_name}: {color_value};\n" + content[insert_pos:]
                consolidated += 1
        
        if consolidated > 0:
            with open(variables_file, 'w') as f:
                f.write(content)
            print(f"✅ Consolidated {consolidated} color definitions")

    def remove_exact_duplicates(self, file_path: Path, classes_to_remove: Set[str]) -> int:
        """Remove exact duplicate classes from a CSS file"""
        with open(file_path, 'r') as f:
            content = f.read()
        
        original_content = content
        removed_count = 0
        
        for class_name in classes_to_remove:
            # Pattern to match the full CSS rule
            pattern = rf'{re.escape(class_name)}\s*\{{[^}}]*\}}'
            matches = re.findall(pattern, content, re.DOTALL)
            
            if matches:
                # Remove all occurrences
                content = re.sub(pattern, '', content, flags=re.DOTALL)
                removed_count += len(matches)
        
        # Clean up extra whitespace
        content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
        
        if content != original_content:
            with open(file_path, 'w') as f:
                f.write(content)
        
        return removed_count

    def replace_long_values_with_variables(self, file_path: Path) -> int:
        """Replace duplicate long values with CSS variables"""
        with open(file_path, 'r') as f:
            content = f.read()
        
        original_content = content
        replacements = 0
        
        for long_value, var_name in self.variables_to_extract.items():
            if long_value in content:
                content = content.replace(long_value, f"var({var_name})")
                replacements += content.count(f"var({var_name})") - original_content.count(f"var({var_name})")
        
        if content != original_content:
            with open(file_path, 'w') as f:
                f.write(content)
        
        return replacements

    def cleanup_pages_folder(self):
        """Phase 1: Complete cleanup of pages folder duplicates"""
        print("\n📁 Phase 1: Cleaning pages folder...")
        
        pages_dir = self.styles_dir / "pages"
        if not pages_dir.exists():
            print("❌ Pages directory not found")
            return
        
        total_removed = 0
        total_files = 0
        
        for css_file in pages_dir.rglob("*.css"):
            removed = self.remove_exact_duplicates(css_file, set(self.safe_removal_classes))
            replaced = self.replace_long_values_with_variables(css_file)
            
            if removed > 0 or replaced > 0:
                print(f"  📄 {css_file.name}: Removed {removed} duplicates, {replaced} variable replacements")
                total_removed += removed
                total_files += 1
        
        print(f"✅ Phase 1 complete: {total_removed} duplicates removed from {total_files} files")

    def cleanup_features_folder(self):
        """Phase 2: Trim overlapping properties from features folder"""
        print("\n🔧 Phase 2: Optimizing features folder...")
        
        features_dir = self.styles_dir / "features"
        if not features_dir.exists():
            print("❌ Features directory not found")
            return
        
        total_files = 0
        
        for css_file in features_dir.rglob("*.css"):
            replaced = self.replace_long_values_with_variables(css_file)
            
            if replaced > 0:
                print(f"  📄 {css_file.name}: {replaced} variable replacements")
                total_files += 1
        
        print(f"✅ Phase 2 complete: Optimized {total_files} files")

    def cleanup_all_files(self):
        """Phase 3: Replace variables across all files"""
        print("\n🌐 Phase 3: Global variable replacement...")
        
        total_files = 0
        total_replacements = 0
        
        for css_file in self.styles_dir.rglob("*.css"):
            # Skip variables file to avoid circular replacement
            if css_file.name == "variables.css":
                continue
                
            replaced = self.replace_long_values_with_variables(css_file)
            
            if replaced > 0:
                print(f"  📄 {css_file.relative_to(self.styles_dir)}: {replaced} replacements")
                total_files += 1
                total_replacements += replaced
        
        print(f"✅ Phase 3 complete: {total_replacements} replacements in {total_files} files")

    def generate_report(self) -> Dict:
        """Generate cleanup report"""
        report = {
            "cleanup_date": datetime.now().isoformat(),
            "project_root": str(self.project_root),
            "backup_location": str(self.backup_dir),
            "phases_completed": [
                "Phase 1: Pages folder cleanup",
                "Phase 2: Features folder optimization", 
                "Phase 3: Global variable replacement",
                "Phase 4: Color consolidation"
            ],
            "variables_extracted": len(self.variables_to_extract),
            "colors_consolidated": len(self.colors_to_consolidate),
            "safe_removal_classes": len(self.safe_removal_classes)
        }
        
        # Calculate file statistics
        css_files = list(self.styles_dir.rglob("*.css"))
        report["total_css_files"] = len(css_files)
        
        # Calculate size reduction (comparing with backup)
        if self.backup_dir.exists():
            original_size = sum(f.stat().st_size for f in self.backup_dir.rglob("*.css"))
            current_size = sum(f.stat().st_size for f in css_files)
            reduction = original_size - current_size
            reduction_percent = (reduction / original_size) * 100 if original_size > 0 else 0
            
            report["size_reduction"] = {
                "original_bytes": original_size,
                "current_bytes": current_size,
                "reduction_bytes": reduction,
                "reduction_percent": round(reduction_percent, 2)
            }
        
        return report

    def run_cleanup(self):
        """Execute complete CSS cleanup process"""
        print("🚀 Starting CSS Duplicate Cleanup")
        print("=" * 50)
        
        # Create backup
        self.create_backup()
        
        # Phase 1: Pages folder cleanup
        self.cleanup_pages_folder()
        
        # Phase 2: Features folder optimization  
        self.cleanup_features_folder()
        
        # Phase 3: Extract and replace variables
        self.extract_css_variables()
        self.cleanup_all_files()
        
        # Phase 4: Color consolidation
        self.consolidate_colors()
        
        # Generate report
        report = self.generate_report()
        
        # Save report
        report_file = self.project_root / "css_cleanup_report.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        print("\n" + "=" * 50)
        print("🎉 CSS Cleanup Complete!")
        print("=" * 50)
        
        if "size_reduction" in report:
            size_info = report["size_reduction"]
            print(f"📊 Size reduction: {size_info['reduction_bytes']:,} bytes ({size_info['reduction_percent']:.1f}%)")
        
        print(f"📁 Backup created: {self.backup_dir}")
        print(f"📋 Report saved: {report_file}")
        print(f"🔧 Variables extracted: {report['variables_extracted']}")
        print(f"🎨 Colors consolidated: {report['colors_consolidated']}")
        
        print("\n✅ Next steps:")
        print("1. Test your application thoroughly")
        print("2. Check for any visual regressions")
        print("3. Update your style guide documentation")
        print("4. Consider running a CSS linter to catch remaining issues")

def main():
    """Main execution function"""
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python css_cleanup.py <project_root_path>")
        print("Example: python css_cleanup.py /path/to/your/project")
        sys.exit(1)
    
    project_root = sys.argv[1]
    
    if not os.path.exists(project_root):
        print(f"❌ Project root '{project_root}' does not exist")
        sys.exit(1)
    
    # Initialize and run cleanup
    cleanup_tool = CSSCleanupTool(project_root)
    
    try:
        cleanup_tool.run_cleanup()
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        print("🔄 You can restore from backup if needed")
        sys.exit(1)

if __name__ == "__main__":
    main()