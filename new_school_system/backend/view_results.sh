#!/bin/bash

# JSON Results Viewer for HK Teacher API Tests
# Usage: ./view_results.sh [results_directory]

RESULTS_DIR="${1:-$(ls -dt test_results_* 2>/dev/null | head -1)}"

if [ -z "$RESULTS_DIR" ] || [ ! -d "$RESULTS_DIR" ]; then
    echo "❌ No results directory found!"
    echo "Usage: $0 [results_directory]"
    echo "Available directories:"
    ls -dt test_results_* 2>/dev/null || echo "  None found"
    exit 1
fi

echo "📊 HK Teacher API Test Results Viewer"
echo "======================================"
echo "📁 Results Directory: $RESULTS_DIR"
echo ""

# Check if jq is available
if ! command -v jq >/dev/null 2>&1; then
    echo "⚠️ jq not found. Install with: sudo apt-get install jq"
    echo "Showing basic results without formatting..."
    echo ""
fi

SUMMARY_FILE="$RESULTS_DIR/summary.json"
RESULTS_FILE="$RESULTS_DIR/test_results.json"

# Show summary
if [ -f "$SUMMARY_FILE" ]; then
    echo "📋 TEST SUMMARY"
    echo "==============="
    if command -v jq >/dev/null 2>&1; then
        cat "$SUMMARY_FILE" | jq -r '
        "🕒 Timestamp: " + .timestamp +
        "\n📊 Total Tests: " + (.totalTests | tostring) +
        "\n✅ Passed: " + (.passed | tostring) +
        "\n❌ Failed: " + (.failed | tostring) +
        "\n📈 Success Rate: " + .successRate +
        "\n⏱️ Duration: " + .duration +
        "\n🎯 Status: " + .status'
    else
        cat "$SUMMARY_FILE"
    fi
    echo ""
fi

# Show menu
while true; do
    echo "🔍 What would you like to view?"
    echo "1) Failed tests only"
    echo "2) Passed tests only" 
    echo "3) All tests summary"
    echo "4) Tests by section"
    echo "5) Extracted data (tokens, IDs)"
    echo "6) Raw JSON (first 10 tests)"
    echo "7) Search tests by name"
    echo "8) Exit"
    echo ""
    read -p "Choose option (1-8): " choice

    case $choice in
        1)
            echo ""
            echo "❌ FAILED TESTS"
            echo "==============="
            if [ -f "$RESULTS_FILE" ] && command -v jq >/dev/null 2>&1; then
                jq -r '.tests[] | select(.status=="failed") | 
                "Test #" + (.id | tostring) + ": " + .name + 
                "\n  Expected: " + (.expectedStatus | tostring) + 
                " | Actual: " + .actualStatus + 
                "\n  Error: " + (.errorMessage // "Unknown") + 
                "\n  Endpoint: " + (.endpoint // "Unknown") + 
                "\n"' "$RESULTS_FILE"
            else
                echo "No detailed results available or jq not installed"
            fi
            ;;
        2)
            echo ""
            echo "✅ PASSED TESTS"
            echo "==============="
            if [ -f "$RESULTS_FILE" ] && command -v jq >/dev/null 2>&1; then
                jq -r '.tests[] | select(.status=="passed") | 
                "✅ Test #" + (.id | tostring) + ": " + .name + 
                " (" + .duration + ")"' "$RESULTS_FILE"
            else
                echo "No detailed results available or jq not installed"
            fi
            ;;
        3)
            echo ""
            echo "📊 ALL TESTS SUMMARY"
            echo "===================="
            if [ -f "$RESULTS_FILE" ] && command -v jq >/dev/null 2>&1; then
                jq -r '.tests[] | 
                (if .status=="passed" then "✅" else "❌" end) + 
                " #" + (.id | tostring) + ": " + .name + 
                " [" + (.expectedStatus | tostring) + " → " + .actualStatus + "]"' "$RESULTS_FILE"
            else
                echo "No detailed results available or jq not installed"
            fi
            ;;
        4)
            echo ""
            echo "📂 TESTS BY SECTION"
            echo "==================="
            if [ -f "$RESULTS_FILE" ] && command -v jq >/dev/null 2>&1; then
                # Group tests by section (roughly every 10-15 tests)
                echo "🔐 Authentication Tests (#1-12):"
                jq -r '.tests[] | select(.id >= 1 and .id <= 12) | 
                "  " + (if .status=="passed" then "✅" else "❌" end) + " " + .name' "$RESULTS_FILE"
                
                echo ""
                echo "🏫 School Management Tests (#13-15):"
                jq -r '.tests[] | select(.id >= 13 and .id <= 18) | 
                "  " + (if .status=="passed" then "✅" else "❌" end) + " " + .name' "$RESULTS_FILE"
                
                echo ""
                echo "👨‍🎓 Student Management Tests (#16-18):"
                jq -r '.tests[] | select(.id >= 16 and .id <= 23) | 
                "  " + (if .status=="passed" then "✅" else "❌" end) + " " + .name' "$RESULTS_FILE"
                
                echo ""
                echo "📋 Reports & Meetings Tests (#19-23):"
                jq -r '.tests[] | select(.id >= 19 and .id <= 25) | 
                "  " + (if .status=="passed" then "✅" else "❌" end) + " " + .name' "$RESULTS_FILE"
                
                echo ""
                echo "🔒 Security & Error Tests (#26+):"
                jq -r '.tests[] | select(.id >= 26) | 
                "  " + (if .status=="passed" then "✅" else "❌" end) + " " + .name' "$RESULTS_FILE"
            else
                echo "No detailed results available or jq not installed"
            fi
            ;;
        5)
            echo ""
            echo "🔑 EXTRACTED DATA"
            echo "=================="
            EXTRACTED_FILE="$RESULTS_DIR/extracted_data.json"
            if [ -f "$EXTRACTED_FILE" ]; then
                if command -v jq >/dev/null 2>&1; then
                    jq -r '
                    to_entries[] | 
                    select(.value != null and .value != "null") |
                    .key + ": " + .value' "$EXTRACTED_FILE"
                else
                    cat "$EXTRACTED_FILE"
                fi
            else
                echo "No extracted data file found"
            fi
            ;;
        6)
            echo ""
            echo "📄 RAW JSON (First 10 tests)"
            echo "============================="
            if [ -f "$RESULTS_FILE" ] && command -v jq >/dev/null 2>&1; then
                jq '.tests[:10]' "$RESULTS_FILE"
            else
                echo "No detailed results available or jq not installed"
            fi
            ;;
        7)
            echo ""
            read -p "🔍 Enter search term: " search_term
            echo ""
            echo "🔍 SEARCH RESULTS for '$search_term'"
            echo "===================================="
            if [ -f "$RESULTS_FILE" ] && command -v jq >/dev/null 2>&1; then
                jq -r --arg term "$search_term" '.tests[] | 
                select(.name | test($term; "i")) |
                (if .status=="passed" then "✅" else "❌" end) + 
                " #" + (.id | tostring) + ": " + .name' "$RESULTS_FILE"
            else
                echo "No detailed results available or jq not installed"
            fi
            ;;
        8)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid option. Please choose 1-8."
            ;;
    esac
    echo ""
    read -p "Press Enter to continue..."
    echo ""
done