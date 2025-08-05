#!/bin/bash

# Improved HK Teacher Student Management System API Testing Script
# Saves results to JSON files and fixes potential issues

BASE_URL="http://localhost:5001/api"
CONTENT_TYPE="Content-Type: application/json"
TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create results directory
RESULTS_DIR="test_results_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

# Initialize JSON results
RESULTS_JSON="$RESULTS_DIR/test_results.json"
SUMMARY_JSON="$RESULTS_DIR/summary.json"
ERRORS_JSON="$RESULTS_DIR/errors.json"

# Initialize results structure
cat > "$RESULTS_JSON" << 'EOF'
{
  "testSuite": {
    "name": "HK Teacher Student Management System API Tests",
    "timestamp": "",
    "baseUrl": "",
    "environment": "development"
  },
  "summary": {
    "totalTests": 0,
    "passed": 0,
    "failed": 0,
    "successRate": "0%",
    "duration": ""
  },
  "sections": [],
  "tests": [],
  "extractedData": {},
  "errors": []
}
EOF

# Start time for duration calculation
START_TIME=$(date +%s)

# Function to safely extract JSON values with improved regex
extract_json_value() {
    local json="$1"
    local key="$2"
    echo "$json" | sed -n 's/.*"'"$key"'":"\([^"]*\)".*/\1/p' | head -1
}

# Function to safely extract MongoDB ObjectId
extract_object_id() {
    local json="$1"
    echo "$json" | grep -o '"_id":"[a-fA-F0-9]\{24\}"' | head -1 | cut -d'"' -f4
}

# Function to add delay between tests with better rate limiting
add_delay() {
    local test_number="$1"
    # Add progressive delay to avoid rate limiting
    if [ $((test_number % 5)) -eq 0 ]; then
        echo "⏳ Adding delay to avoid rate limiting..."
        sleep 3
    elif [ $((test_number % 3)) -eq 0 ]; then
        sleep 1
    fi
}

# Function to update JSON results
update_json_results() {
    local test_data="$1"
    
    # Use jq to properly update JSON (install with: sudo apt-get install jq)
    if command -v jq >/dev/null 2>&1; then
        echo "$test_data" | jq '.' >> "$RESULTS_DIR/test_${TEST_COUNT}.json"
        
        # Update main results file
        jq --argjson new_test "$test_data" '.tests += [$new_test]' "$RESULTS_JSON" > "$RESULTS_JSON.tmp" && mv "$RESULTS_JSON.tmp" "$RESULTS_JSON"
    else
        # Fallback without jq
        echo "$test_data" >> "$RESULTS_DIR/test_${TEST_COUNT}.json"
    fi
}

# Function to run a test with improved error handling and JSON output
run_test() {
    local test_name="$1"
    local curl_command="$2"
    local expected_status="$3"
    local expected_contains="$4"
    local should_fail="$5"
    
    TEST_COUNT=$((TEST_COUNT + 1))
    
    # Add delay to avoid rate limiting
    add_delay $TEST_COUNT
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}Test #$TEST_COUNT: $test_name${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Start test timer
    local test_start_time=$(date +%s)
    
    # Execute the curl command with timeout and better error handling
    local response=""
    local http_status=""
    local curl_exit_code=0
    
    # Add timeout and better error handling to curl
    local modified_command="${curl_command} -w '\\n%{http_code}' --max-time 30 --retry 2 --retry-delay 1"
    
    echo -e "${YELLOW}📋 Executing test...${NC}"
    
    # Capture both response and exit code
    local full_response
    if full_response=$(eval $modified_command 2>&1); then
        response=$(echo "$full_response" | sed '$d')
        http_status=$(echo "$full_response" | tail -n1)
    else
        curl_exit_code=$?
        response="CURL_ERROR: $full_response"
        http_status="000"
    fi
    
    # Calculate test duration
    local test_end_time=$(date +%s)
    local test_duration=$((test_end_time - test_start_time))
    
    echo -e "${YELLOW}📊 Expected Result:${NC}"
    if [ "$should_fail" = "true" ]; then
        echo "❌ Should FAIL - HTTP Status: $expected_status"
    else
        echo "✅ Should PASS - HTTP Status: $expected_status"
    fi
    if [ ! -z "$expected_contains" ]; then
        echo "📝 Should contain: '$expected_contains'"
    fi
    echo ""
    
    echo -e "${YELLOW}📈 Actual Result:${NC}"
    echo "HTTP Status: $http_status"
    echo "Response: ${response:0:500}$([ ${#response} -gt 500 ] && echo '...')"
    echo "Duration: ${test_duration}s"
    echo ""
    
    # Validate the result
    local test_passed=false
    local status_match=false
    local content_match=true
    local error_message=""
    
    # Handle curl errors
    if [ $curl_exit_code -ne 0 ]; then
        error_message="CURL_ERROR: Exit code $curl_exit_code"
        test_passed=false
    else
        # Check HTTP status
        if [ "$http_status" = "$expected_status" ]; then
            status_match=true
        fi
        
        # Check response content if specified
        if [ ! -z "$expected_contains" ]; then
            if [[ "$response" == *"$expected_contains"* ]]; then
                content_match=true
            else
                content_match=false
                error_message="Content mismatch: '$expected_contains' not found"
            fi
        fi
        
        # Determine if test passed
        if [ "$status_match" = true ] && [ "$content_match" = true ]; then
            test_passed=true
        elif [ "$status_match" = false ]; then
            error_message="Status mismatch: Expected $expected_status, Got $http_status"
        fi
    fi
    
    echo -e "${YELLOW}🔍 Result Validation:${NC}"
    if [ "$status_match" = true ]; then
        echo -e "✅ HTTP Status Match: Expected $expected_status, Got $http_status"
    else
        echo -e "❌ HTTP Status Mismatch: Expected $expected_status, Got $http_status"
    fi
    
    if [ ! -z "$expected_contains" ]; then
        if [ "$content_match" = true ]; then
            echo -e "✅ Content Match: Found '$expected_contains'"
        else
            echo -e "❌ Content Mismatch: '$expected_contains' not found"
        fi
    fi
    
    if [ "$test_passed" = true ]; then
        echo -e "${GREEN}🎉 TEST PASSED${NC}"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${RED}💥 TEST FAILED${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    
    # Create JSON test result
    local json_result=$(cat << EOF
{
  "id": $TEST_COUNT,
  "name": "$test_name",
  "status": "$([ "$test_passed" = true ] && echo "passed" || echo "failed")",
  "method": "$(echo "$curl_command" | grep -o '\-X [A-Z]*' | cut -d' ' -f2)",
  "endpoint": "$(echo "$curl_command" | grep -o "'[^']*api[^']*'" | sed 's/.*api//' | sed "s/'.*//")""
  "expectedStatus": $expected_status,
  "actualStatus": "$http_status",
  "expectedContent": "$expected_contains",
  "actualContent": "$(echo "$response" | head -c 200 | sed 's/"/\\"/g')",
  "shouldFail": $should_fail,
  "duration": "${test_duration}s",
  "curlExitCode": $curl_exit_code,
  "errorMessage": "$error_message",
  "timestamp": "$(date -Iseconds)"
}
EOF
)
    
    # Update JSON results
    update_json_results "$json_result"
    
    echo ""
    echo "Current Score: $PASS_COUNT passed, $FAIL_COUNT failed out of $TEST_COUNT tests"
    
    # Store important data for later tests with improved extraction
    case "$test_name" in
        *"Admin Login"*)
            if [ "$test_passed" = true ] && [ "$curl_exit_code" -eq 0 ]; then
                ADMIN_TOKEN=$(extract_json_value "$response" "token")
                if [ ! -z "$ADMIN_TOKEN" ] && [ ${#ADMIN_TOKEN} -gt 10 ]; then
                    echo "🔑 Admin token extracted: ${ADMIN_TOKEN:0:30}..."
                    echo "{\"adminToken\": \"$ADMIN_TOKEN\"}" > "$RESULTS_DIR/admin_token.json"
                else
                    echo "⚠️ Failed to extract admin token"
                fi
            fi
            ;;
        *"Teacher Registration"*)
            if [ "$test_passed" = true ]; then
                TEACHER_EMAIL="testteacher@example.com"
                echo "👨‍🏫 Teacher email stored: $TEACHER_EMAIL"
                echo "{\"teacherEmail\": \"$TEACHER_EMAIL\"}" > "$RESULTS_DIR/teacher_email.json"
            fi
            ;;
        *"Teacher Login"*)
            if [ "$test_passed" = true ] && [ "$curl_exit_code" -eq 0 ]; then
                TEACHER_TOKEN=$(extract_json_value "$response" "token")
                if [ ! -z "$TEACHER_TOKEN" ] && [ ${#TEACHER_TOKEN} -gt 10 ]; then
                    echo "🔑 Teacher token extracted: ${TEACHER_TOKEN:0:30}..."
                    echo "{\"teacherToken\": \"$TEACHER_TOKEN\"}" > "$RESULTS_DIR/teacher_token.json"
                else
                    echo "⚠️ Failed to extract teacher token"
                fi
            fi
            ;;
        *"Create School"*)
            if [ "$test_passed" = true ] && [ "$curl_exit_code" -eq 0 ]; then
                SCHOOL_ID=$(extract_object_id "$response")
                if [ ! -z "$SCHOOL_ID" ] && [ ${#SCHOOL_ID} -eq 24 ]; then
                    echo "🏫 School ID extracted: $SCHOOL_ID"
                    echo "{\"schoolId\": \"$SCHOOL_ID\"}" > "$RESULTS_DIR/school_id.json"
                else
                    echo "⚠️ Failed to extract school ID"
                fi
            fi
            ;;
        *"Create Student"*)
            if [ "$test_passed" = true ] && [ "$curl_exit_code" -eq 0 ]; then
                STUDENT_ID=$(extract_object_id "$response")
                if [ ! -z "$STUDENT_ID" ] && [ ${#STUDENT_ID} -eq 24 ]; then
                    echo "👨‍🎓 Student ID extracted: $STUDENT_ID"
                    echo "{\"studentId\": \"$STUDENT_ID\"}" > "$RESULTS_DIR/student_id.json"
                else
                    echo "⚠️ Failed to extract student ID"
                fi
            fi
            ;;
        *"Create Student Report"*)
            if [ "$test_passed" = true ] && [ "$curl_exit_code" -eq 0 ]; then
                REPORT_ID=$(extract_object_id "$response")
                if [ ! -z "$REPORT_ID" ] && [ ${#REPORT_ID} -eq 24 ]; then
                    echo "📊 Report ID extracted: $REPORT_ID"
                    echo "{\"reportId\": \"$REPORT_ID\"}" > "$RESULTS_DIR/report_id.json"
                else
                    echo "⚠️ Failed to extract report ID"
                fi
            fi
            ;;
        *"Create Regular Meeting"*)
            if [ "$test_passed" = true ] && [ "$curl_exit_code" -eq 0 ]; then
                REGULAR_MEETING_ID=$(extract_object_id "$response")
                if [ ! -z "$REGULAR_MEETING_ID" ] && [ ${#REGULAR_MEETING_ID} -eq 24 ]; then
                    echo "📅 Regular Meeting ID extracted: $REGULAR_MEETING_ID"
                    echo "{\"regularMeetingId\": \"$REGULAR_MEETING_ID\"}" > "$RESULTS_DIR/regular_meeting_id.json"
                else
                    echo "⚠️ Failed to extract regular meeting ID"
                fi
            fi
            ;;
        *"Create IEP Meeting"*)
            if [ "$test_passed" = true ] && [ "$curl_exit_code" -eq 0 ]; then
                IEP_MEETING_ID=$(extract_object_id "$response")
                if [ ! -z "$IEP_MEETING_ID" ] && [ ${#IEP_MEETING_ID} -eq 24 ]; then
                    echo "📋 IEP Meeting ID extracted: $IEP_MEETING_ID"
                    echo "{\"iepMeetingId\": \"$IEP_MEETING_ID\"}" > "$RESULTS_DIR/iep_meeting_id.json"
                else
                    echo "⚠️ Failed to extract IEP meeting ID"
                fi
            fi
            ;;
    esac
}

# Function to print section header
print_section() {
    echo ""
    echo ""
    echo "████████████████████████████████████████████████████████████████████████████████████████"
    echo -e "${BLUE}█  $1  █${NC}"
    echo "████████████████████████████████████████████████████████████████████████████████████████"
    echo ""
}

# Function to update final summary JSON
update_final_summary() {
    local end_time=$(date +%s)
    local total_duration=$((end_time - START_TIME))
    local percentage=0
    
    if [ $TEST_COUNT -gt 0 ]; then
        percentage=$(( (PASS_COUNT * 100) / TEST_COUNT ))
    fi
    
    # Update main results JSON
    if command -v jq >/dev/null 2>&1; then
        jq --arg timestamp "$(date -Iseconds)" \
           --arg baseUrl "$BASE_URL" \
           --argjson total "$TEST_COUNT" \
           --argjson passed "$PASS_COUNT" \
           --argjson failed "$FAIL_COUNT" \
           --arg rate "${percentage}%" \
           --arg duration "${total_duration}s" \
           '.testSuite.timestamp = $timestamp | 
            .testSuite.baseUrl = $baseUrl |
            .summary.totalTests = $total |
            .summary.passed = $passed |
            .summary.failed = $failed |
            .summary.successRate = $rate |
            .summary.duration = $duration' \
           "$RESULTS_JSON" > "$RESULTS_JSON.tmp" && mv "$RESULTS_JSON.tmp" "$RESULTS_JSON"
    fi
    
    # Create separate summary file
    cat > "$SUMMARY_JSON" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "totalTests": $TEST_COUNT,
  "passed": $PASS_COUNT,
  "failed": $FAIL_COUNT,
  "successRate": "${percentage}%",
  "duration": "${total_duration}s",
  "status": "$([ $percentage -eq 100 ] && echo "perfect" || [ $percentage -ge 90 ] && echo "excellent" || [ $percentage -ge 80 ] && echo "good" || [ $percentage -ge 70 ] && echo "fair" || echo "poor")",
  "resultFiles": {
    "detailedResults": "$RESULTS_JSON",
    "summary": "$SUMMARY_JSON",
    "errors": "$ERRORS_JSON",
    "extractedData": "$RESULTS_DIR/extracted_data.json"
  }
}
EOF
    
    # Create extracted data summary
    cat > "$RESULTS_DIR/extracted_data.json" << EOF
{
  "adminToken": "${ADMIN_TOKEN:-null}",
  "teacherToken": "${TEACHER_TOKEN:-null}",
  "teacherEmail": "${TEACHER_EMAIL:-null}",
  "schoolId": "${SCHOOL_ID:-null}",
  "studentId": "${STUDENT_ID:-null}",
  "reportId": "${REPORT_ID:-null}",
  "regularMeetingId": "${REGULAR_MEETING_ID:-null}",
  "iepMeetingId": "${IEP_MEETING_ID:-null}"
}
EOF
}

# Function to print final summary
print_summary() {
    update_final_summary
    
    echo ""
    echo ""
    echo "▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓"
    echo -e "${BLUE}                              FINAL TEST SUMMARY                                ${NC}"
    echo "▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓"
    echo ""
    echo -e "${GREEN}✅ Tests Passed: $PASS_COUNT${NC}"
    echo -e "${RED}❌ Tests Failed: $FAIL_COUNT${NC}"
    echo -e "${BLUE}📊 Total Tests: $TEST_COUNT${NC}"
    
    local percentage=0
    if [ $TEST_COUNT -gt 0 ]; then
        percentage=$(( (PASS_COUNT * 100) / TEST_COUNT ))
    fi
    
    echo -e "${YELLOW}📈 Success Rate: $percentage%${NC}"
    echo ""
    
    if [ $percentage -eq 100 ]; then
        echo -e "${GREEN}🎉 PERFECT SCORE! All tests passed! Your backend is solid! 🎉${NC}"
    elif [ $percentage -ge 90 ]; then
        echo -e "${GREEN}🌟 EXCELLENT! Almost perfect score!${NC}"
    elif [ $percentage -ge 80 ]; then
        echo -e "${YELLOW}👍 GOOD! Most tests passed, minor issues to fix.${NC}"
    elif [ $percentage -ge 70 ]; then
        echo -e "${YELLOW}⚠️  FAIR! Several issues need attention.${NC}"
    else
        echo -e "${RED}🚨 POOR! Major issues need to be fixed.${NC}"
    fi
    
    echo ""
    echo "📁 Results saved to: $RESULTS_DIR/"
    echo "📊 Main results: $RESULTS_JSON"
    echo "📋 Summary: $SUMMARY_JSON"
    echo "🔍 Individual tests: $RESULTS_DIR/test_*.json"
    echo ""
}

# Start of testing
echo "🚀 HK Teacher Student Management System - Comprehensive API Testing"
echo "====================================================================="
echo ""
echo "📍 Testing Server: $BASE_URL"
echo "📅 Test Date: $(date)"
echo "🔧 Test Environment: Development"
echo "📁 Results Directory: $RESULTS_DIR"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."
if ! command -v curl >/dev/null 2>&1; then
    echo "❌ curl is not installed. Please install curl first."
    exit 1
fi

if command -v jq >/dev/null 2>&1; then
    echo "✅ jq found - will use proper JSON handling"
else
    echo "⚠️ jq not found - will use basic JSON handling (install with: sudo apt-get install jq)"
fi

# Test server connectivity
echo "🌐 Testing server connectivity..."
if curl -s --max-time 10 "$BASE_URL/health" > /dev/null 2>&1; then
    echo "✅ Server is responding"
else
    echo "❌ Server is not responding at $BASE_URL"
    echo "Please make sure your server is running on port 5001"
    exit 1
fi

# Initialize variables
ADMIN_TOKEN=""
TEACHER_TOKEN=""
TEACHER_EMAIL=""
SCHOOL_ID=""
STUDENT_ID=""
REPORT_ID=""
REGULAR_MEETING_ID=""
IEP_MEETING_ID=""

# ================================================================================
# SECTION 1: AUTHENTICATION & USER MANAGEMENT TESTS
# ================================================================================

print_section "SECTION 1: AUTHENTICATION & USER MANAGEMENT TESTS"

# Test 1: Create Admin User (Development Only)
run_test "Create Admin User for Testing" \
    "curl -s -X POST '$BASE_URL/auth/debug/create-admin'" \
    "200" \
    "Admin user" \
    "false"

# Test 2: Admin Login with Correct Credentials
run_test "Admin Login with Correct Credentials" \
    "curl -s -X POST '$BASE_URL/auth/login' -H '$CONTENT_TYPE' -d '{\"email\":\"admin@hkteacher.dev\",\"password\":\"Admin123!@#\"}'" \
    "200" \
    "token" \
    "false"

# Test 3: Login with Incorrect Email
run_test "Login with Incorrect Email" \
    "curl -s -X POST '$BASE_URL/auth/login' -H '$CONTENT_TYPE' -d '{\"email\":\"wrong@email.com\",\"password\":\"Admin123!@#\"}'" \
    "401" \
    "Invalid credentials" \
    "true"

# Test 4: Login with Incorrect Password
run_test "Login with Incorrect Password" \
    "curl -s -X POST '$BASE_URL/auth/login' -H '$CONTENT_TYPE' -d '{\"email\":\"admin@hkteacher.dev\",\"password\":\"wrongpassword\"}'" \
    "401" \
    "Invalid credentials" \
    "true"

# Test 5: Login with Missing Email
run_test "Login with Missing Email" \
    "curl -s -X POST '$BASE_URL/auth/login' -H '$CONTENT_TYPE' -d '{\"password\":\"Admin123!@#\"}'" \
    "400" \
    "Validation failed" \
    "true"

# Test 6: Verify Invite Code (Valid)
run_test "Verify Valid Invite Code" \
    "curl -s -X POST '$BASE_URL/auth/verify-invite' -H '$CONTENT_TYPE' -d '{\"inviteCode\":\"1234567890\"}'" \
    "200" \
    "valid" \
    "false"

# Test 7: Verify Invite Code (Invalid)
run_test "Verify Invalid Invite Code" \
    "curl -s -X POST '$BASE_URL/auth/verify-invite' -H '$CONTENT_TYPE' -d '{\"inviteCode\":\"invalidcode\"}'" \
    "400" \
    "Invalid invite code" \
    "true"

# Test 8: Teacher Registration with Valid Data
run_test "Teacher Registration with Valid Data" \
    "curl -s -X POST '$BASE_URL/auth/register' -H '$CONTENT_TYPE' -d '{
        \"name\":\"Test Teacher\",
        \"email\":\"testteacher@example.com\",
        \"phone\":\"+852 9876 5432\",
        \"password\":\"Teacher123!@#\",
        \"inviteCode\":\"1234567890\",
        \"preferredDistrict\":\"Central and Western\",
        \"experience\":5,
        \"subjects\":[\"Mathematics\",\"English\"]
    }'" \
    "201" \
    "registered successfully" \
    "false"

# Test 9: Teacher Registration with Duplicate Email
run_test "Teacher Registration with Duplicate Email" \
    "curl -s -X POST '$BASE_URL/auth/register' -H '$CONTENT_TYPE' -d '{
        \"name\":\"Another Teacher\",
        \"email\":\"testteacher@example.com\",
        \"phone\":\"+852 1111 2222\",
        \"password\":\"Teacher123!@#\",
        \"inviteCode\":\"1234567890\"
    }'" \
    "400" \
    "already exists" \
    "true"

# Test 10: Teacher Registration with Used Invite Code
run_test "Teacher Registration with Used Invite Code" \
    "curl -s -X POST '$BASE_URL/auth/register' -H '$CONTENT_TYPE' -d '{
        \"name\":\"Third Teacher\",
        \"email\":\"teacher3@example.com\",
        \"phone\":\"+852 3333 4444\",
        \"password\":\"Teacher123!@#\",
        \"inviteCode\":\"1234567890\"
    }'" \
    "400" \
    "already been used" \
    "true"

# Test 11: Teacher Registration with Weak Password
run_test "Teacher Registration with Weak Password" \
    "curl -s -X POST '$BASE_URL/auth/register' -H '$CONTENT_TYPE' -d '{
        \"name\":\"Fourth Teacher\",
        \"email\":\"teacher4@example.com\",
        \"phone\":\"+852 4444 5555\",
        \"password\":\"weak\",
        \"inviteCode\":\"1234567890\"
    }'" \
    "400" \
    "Password must" \
    "true"

# Test 12: Teacher Login
run_test "Teacher Login with Valid Credentials" \
    "curl -s -X POST '$BASE_URL/auth/login' -H '$CONTENT_TYPE' -d '{\"email\":\"testteacher@example.com\",\"password\":\"Teacher123!@#\"}'" \
    "200" \
    "token" \
    "false"

# Test 13: Get User Profile (Admin)
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Get Admin User Profile" \
        "curl -s -X GET '$BASE_URL/auth/me' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "admin@hkteacher.dev" \
        "false"
fi

# Test 14: Get User Profile (Teacher)
if [ ! -z "$TEACHER_TOKEN" ]; then
    run_test "Get Teacher User Profile" \
        "curl -s -X GET '$BASE_URL/auth/me' -H 'Authorization: Bearer $TEACHER_TOKEN'" \
        "200" \
        "testteacher@example.com" \
        "false"
fi

# Test 15: Access Protected Route Without Token
run_test "Access Protected Route Without Token" \
    "curl -s -X GET '$BASE_URL/auth/me'" \
    "401" \
    "Not authorized" \
    "true"

# Test 16: Access Protected Route With Invalid Token
run_test "Access Protected Route With Invalid Token" \
    "curl -s -X GET '$BASE_URL/auth/me' -H 'Authorization: Bearer invalid_token'" \
    "401" \
    "Invalid token" \
    "true"

# Test 17: Update User Details (Valid)
if [ ! -z "$TEACHER_TOKEN" ]; then
    run_test "Update Teacher User Details" \
        "curl -s -X PUT '$BASE_URL/auth/updatedetails' -H 'Authorization: Bearer $TEACHER_TOKEN' -H '$CONTENT_TYPE' -d '{\"name\":\"Updated Teacher Name\"}'" \
        "200" \
        "updated successfully" \
        "false"
fi

# Test 18: Update Password (Valid)
if [ ! -z "$TEACHER_TOKEN" ]; then
    run_test "Update Teacher Password" \
        "curl -s -X PUT '$BASE_URL/auth/updatepassword' -H 'Authorization: Bearer $TEACHER_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"currentPassword\":\"Teacher123!@#\",
            \"newPassword\":\"NewTeacher123!@#\",
            \"confirmPassword\":\"NewTeacher123!@#\"
        }'" \
        "200" \
        "updated successfully" \
        "false"
fi

# Test 19: Update Password (Wrong Current Password)
if [ ! -z "$TEACHER_TOKEN" ]; then
    run_test "Update Password with Wrong Current Password" \
        "curl -s -X PUT '$BASE_URL/auth/updatepassword' -H 'Authorization: Bearer $TEACHER_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"currentPassword\":\"WrongPassword\",
            \"newPassword\":\"NewTeacher456!@#\",
            \"confirmPassword\":\"NewTeacher456!@#\"
        }'" \
        "400" \
        "incorrect" \
        "true"
fi

# Test 20: Forgot Password (Valid Email)
run_test "Forgot Password with Valid Email" \
    "curl -s -X POST '$BASE_URL/auth/forgotpassword' -H '$CONTENT_TYPE' -d '{\"email\":\"testteacher@example.com\"}'" \
    "200" \
    "password reset email" \
    "false"

# Test 21: Forgot Password (Non-existent Email)
run_test "Forgot Password with Non-existent Email" \
    "curl -s -X POST '$BASE_URL/auth/forgotpassword' -H '$CONTENT_TYPE' -d '{\"email\":\"nonexistent@example.com\"}'" \
    "200" \
    "password reset email" \
    "false"

# ================================================================================
# SECTION 2: SCHOOL MANAGEMENT TESTS
# ================================================================================

print_section "SECTION 2: SCHOOL MANAGEMENT TESTS"

# Test 22: Create School (Admin)
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Create School with Valid Data (Admin)" \
        "curl -s -X POST '$BASE_URL/schools' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"Test Primary School\",
            \"nameEn\":\"Test Primary School\",
            \"schoolType\":\"primary\",
            \"district\":\"Central and Western\",
            \"address\":\"123 Test Street, Central, Hong Kong\",
            \"contactPerson\":\"Principal Wong\",
            \"email\":\"principal@testschool.edu.hk\",
            \"phone\":\"+852 2234 5678\",
            \"description\":\"A test primary school for API testing\"
        }'" \
        "201" \
        "created successfully" \
        "false"
fi

# Test 23: Create School (Teacher - Should Succeed)
if [ ! -z "$TEACHER_TOKEN" ]; then
    run_test "Create School with Valid Data (Teacher)" \
        "curl -s -X POST '$BASE_URL/schools' -H 'Authorization: Bearer $TEACHER_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"Teacher Test School\",
            \"nameEn\":\"Teacher Test School\",
            \"schoolType\":\"secondary\",
            \"district\":\"Eastern\",
            \"address\":\"456 Teacher Street, Causeway Bay, Hong Kong\",
            \"contactPerson\":\"Head Teacher\",
            \"email\":\"head@teacherschool.edu.hk\",
            \"phone\":\"+852 2345 6789\"
        }'" \
        "201" \
        "created successfully" \
        "false"
fi

# Test 24: Create School with Duplicate Name
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Create School with Duplicate Name" \
        "curl -s -X POST '$BASE_URL/schools' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"Test Primary School\",
            \"schoolType\":\"primary\",
            \"district\":\"Central and Western\"
        }'" \
        "400" \
        "already exists" \
        "true"
fi

# Test 25: Create School with Invalid School Type
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Create School with Invalid School Type" \
        "curl -s -X POST '$BASE_URL/schools' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"Invalid Type School\",
            \"schoolType\":\"university\",
            \"district\":\"Central and Western\"
        }'" \
        "400" \
        "must be primary" \
        "true"
fi

# Test 26: Create School with Invalid District
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Create School with Invalid District" \
        "curl -s -X POST '$BASE_URL/schools' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"Invalid District School\",
            \"schoolType\":\"primary\",
            \"district\":\"Invalid District\"
        }'" \
        "400" \
        "valid Hong Kong district" \
        "true"
fi

# Test 27: Create School with Missing Required Fields
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Create School with Missing Required Fields" \
        "curl -s -X POST '$BASE_URL/schools' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"Incomplete School\"
        }'" \
        "400" \
        "required" \
        "true"
fi

# Test 28: Get All Schools (Admin)
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Get All Schools (Admin)" \
        "curl -s -X GET '$BASE_URL/schools' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "Test Primary School" \
        "false"
fi

# Test 29: Get All Schools (Teacher - Should See Only Assigned Schools)
if [ ! -z "$TEACHER_TOKEN" ]; then
    run_test "Get All Schools (Teacher)" \
        "curl -s -X GET '$BASE_URL/schools' -H 'Authorization: Bearer $TEACHER_TOKEN'" \
        "200" \
        "Teacher Test School" \
        "false"
fi

# Test 30: Get Single School (Valid ID)
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Get Single School with Valid ID" \
        "curl -s -X GET '$BASE_URL/schools/$SCHOOL_ID' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "Test Primary School" \
        "false"
fi

# Test 31: Get Single School (Invalid ID)
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Get Single School with Invalid ID" \
        "curl -s -X GET '$BASE_URL/schools/000000000000000000000000' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "404" \
        "not found" \
        "true"
fi

# Test 32: Update School (Authorized User)
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Update School with Valid Data" \
        "curl -s -X PUT '$BASE_URL/schools/$SCHOOL_ID' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"description\":\"Updated school description for testing\"
        }'" \
        "200" \
        "updated successfully" \
        "false"
fi

# Test 33: Update School with Immutable Field (Should Fail)
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Update School with Immutable Field" \
        "curl -s -X PUT '$BASE_URL/schools/$SCHOOL_ID' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"schoolType\":\"secondary\"
        }'" \
        "400" \
        "cannot be modified" \
        "true"
fi

# Test 34: Get School Statistics
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Get School Statistics" \
        "curl -s -X GET '$BASE_URL/schools/$SCHOOL_ID/stats' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "students" \
        "false"
fi

# Test 35: Add Teacher to School (Valid Email)
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ] && [ ! -z "$TEACHER_EMAIL" ]; then
    run_test "Add Teacher to School" \
        "curl -s -X POST '$BASE_URL/schools/$SCHOOL_ID/teachers' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"teacherEmail\":\"'$TEACHER_EMAIL'\",
            \"role\":\"teacher\",
            \"subjects\":[\"Mathematics\"],
            \"grades\":[\"P1\",\"P2\"]
        }'" \
        "200" \
        "added to school successfully" \
        "false"
fi

# Test 36: Add Non-existent Teacher to School
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Add Non-existent Teacher to School" \
        "curl -s -X POST '$BASE_URL/schools/$SCHOOL_ID/teachers' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"teacherEmail\":\"nonexistent@teacher.com\",
            \"role\":\"teacher\"
        }'" \
        "404" \
        "not found" \
        "true"
fi

# Test 37: Add Academic Year to School
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Add Academic Year to School" \
        "curl -s -X POST '$BASE_URL/schools/$SCHOOL_ID/academic-years' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"year\":\"2026/27\",
            \"startDate\":\"2026-09-01\",
            \"endDate\":\"2027-07-31\"
        }'" \
        "200" \
        "added successfully" \
        "false"
fi

# Test 38: Add Duplicate Academic Year
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Add Duplicate Academic Year" \
        "curl -s -X POST '$BASE_URL/schools/$SCHOOL_ID/academic-years' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"year\":\"2026/27\"
        }'" \
        "400" \
        "already exists" \
        "true"
fi

# Test 39: Set Active Academic Year
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Set Active Academic Year" \
        "curl -s -X PUT '$BASE_URL/schools/$SCHOOL_ID/academic-years/2026%2F27/activate' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "updated successfully" \
        "false"
fi

# ================================================================================
# SECTION 3: STUDENT MANAGEMENT TESTS
# ================================================================================

print_section "SECTION 3: STUDENT MANAGEMENT TESTS"

# Test 40: Create Student (Valid Data)
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Create Student with Valid Data" \
        "curl -s -X POST '$BASE_URL/students' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"張小明\",
            \"nameEn\":\"Zhang Xiaoming\",
            \"nameCh\":\"張小明\",
            \"studentId\":\"2025001\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"grade\":\"P1\",
            \"class\":\"1A\",
            \"classNumber\":1,
            \"dateOfBirth\":\"2018-05-15\",
            \"gender\":\"male\",
            \"contactInfo\":{
                \"parentName\":\"張先生\",
                \"parentPhone\":\"+852 9123 4567\",
                \"parentEmail\":\"parent@example.com\",
                \"address\":\"香港中環德輔道中123號\"
            }
        }'" \
        "201" \
        "created successfully" \
        "false"
fi

# Test 41: Create Student with Duplicate Student ID
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Create Student with Duplicate Student ID" \
        "curl -s -X POST '$BASE_URL/students' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"李小華\",
            \"nameEn\":\"Lee Xiaohua\",
            \"studentId\":\"2025001\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"grade\":\"P1\",
            \"class\":\"1A\",
            \"classNumber\":2
        }'" \
        "409" \
        "already exists" \
        "true"
fi

# Test 42: Create Student with Duplicate Class Number
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Create Student with Duplicate Class Number" \
        "curl -s -X POST '$BASE_URL/students' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"王小美\",
            \"nameEn\":\"Wang Xiaomei\",
            \"studentId\":\"2025002\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"grade\":\"P1\",
            \"class\":\"1A\",
            \"classNumber\":1
        }'" \
        "409" \
        "already exists" \
        "true"
fi

# Test 43: Create Student with Invalid Grade for School Type
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Create Student with Invalid Grade for School Type" \
        "curl -s -X POST '$BASE_URL/students' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"陳小龍\",
            \"nameEn\":\"Chen Xiaolong\",
            \"studentId\":\"2025003\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"grade\":\"S1\",
            \"class\":\"1A\",
            \"classNumber\":3
        }'" \
        "400" \
        "not suitable" \
        "true"
fi

# Test 44: Create Student for Unauthorized School (Teacher)
if [ ! -z "$TEACHER_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Create Student for Unauthorized School (Teacher)" \
        "curl -s -X POST '$BASE_URL/students' -H 'Authorization: Bearer $TEACHER_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"劉小強\",
            \"nameEn\":\"Liu Xiaoqiang\",
            \"studentId\":\"2025004\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"grade\":\"P2\",
            \"class\":\"2A\",
            \"classNumber\":1
        }'" \
        "403" \
        "Not authorized" \
        "true"
fi

# Test 45: Create Student with Missing Required Fields
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Create Student with Missing Required Fields" \
        "curl -s -X POST '$BASE_URL/students' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"incomplete student\",
            \"school\":\"'$SCHOOL_ID'\"
        }'" \
        "400" \
        "required" \
        "true"
fi

# Test 46: Create Student with Invalid Academic Year Format
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Create Student with Invalid Academic Year Format" \
        "curl -s -X POST '$BASE_URL/students' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"Invalid Year Student\",
            \"studentId\":\"2025005\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025-2026\",
            \"grade\":\"P1\",
            \"class\":\"1A\",
            \"classNumber\":5
        }'" \
        "400" \
        "format YYYY/YY" \
        "true"
fi

# Test 47: Get All Students (Admin)
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Get All Students (Admin)" \
        "curl -s -X GET '$BASE_URL/students' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "張小明" \
        "false"
fi

# Test 48: Get All Students (Teacher - Limited Access)
if [ ! -z "$TEACHER_TOKEN" ]; then
    run_test "Get All Students (Teacher)" \
        "curl -s -X GET '$BASE_URL/students' -H 'Authorization: Bearer $TEACHER_TOKEN'" \
        "200" \
        "students" \
        "false"
fi

# Test 49: Get Single Student (Valid ID)
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$STUDENT_ID" ]; then
    run_test "Get Single Student with Valid ID" \
        "curl -s -X GET '$BASE_URL/students/$STUDENT_ID' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "張小明" \
        "false"
fi

# Test 50: Get Single Student (Invalid ID)
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Get Single Student with Invalid ID" \
        "curl -s -X GET '$BASE_URL/students/000000000000000000000000' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "404" \
        "not found" \
        "true"
fi

# Test 51: Update Student (Valid Data)
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$STUDENT_ID" ]; then
    run_test "Update Student with Valid Data" \
        "curl -s -X PUT '$BASE_URL/students/$STUDENT_ID' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"notes\":\"Updated student notes for testing\"
        }'" \
        "200" \
        "updated successfully" \
        "false"
fi

# Test 52: Update Student (Unauthorized User)
if [ ! -z "$TEACHER_TOKEN" ] && [ ! -z "$STUDENT_ID" ]; then
    run_test "Update Student (Unauthorized Teacher)" \
        "curl -s -X PUT '$BASE_URL/students/$STUDENT_ID' -H 'Authorization: Bearer $TEACHER_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"notes\":\"Unauthorized update attempt\"
        }'" \
        "403" \
        "Not authorized" \
        "true"
fi

# Test 53: Add Teacher to Student
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$STUDENT_ID" ] && [ ! -z "$TEACHER_EMAIL" ]; then
    run_test "Add Teacher to Student" \
        "curl -s -X POST '$BASE_URL/students/$STUDENT_ID/teachers' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"teacherEmail\":\"'$TEACHER_EMAIL'\",
            \"subjects\":[\"Mathematics\"],
            \"isPrimaryTeacher\":false
        }'" \
        "200" \
        "added to student successfully" \
        "false"
fi

# Test 54: Add Non-existent Teacher to Student
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$STUDENT_ID" ]; then
    run_test "Add Non-existent Teacher to Student" \
        "curl -s -X POST '$BASE_URL/students/$STUDENT_ID/teachers' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"teacherEmail\":\"nonexistent@teacher.com\",
            \"subjects\":[\"English\"]
        }'" \
        "404" \
        "not found" \
        "true"
fi

# Test 55: Get My Students (Teacher)
if [ ! -z "$TEACHER_TOKEN" ]; then
    run_test "Get My Students (Teacher)" \
        "curl -s -X GET '$BASE_URL/students/my-students' -H 'Authorization: Bearer $TEACHER_TOKEN'" \
        "200" \
        "students" \
        "false"
fi

# Test 56: Get Student Statistics by School
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Get Student Statistics by School" \
        "curl -s -X GET '$BASE_URL/students/stats/$SCHOOL_ID' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "total" \
        "false"
fi

# Test 57: Advanced Student Search
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Advanced Student Search" \
        "curl -s -X GET '$BASE_URL/students/search/advanced?schoolId=$SCHOOL_ID&academicYear=2025%2F26&grade=P1' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "students" \
        "false"
fi

# Test 58: Get Student Progression History
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$STUDENT_ID" ]; then
    run_test "Get Student Progression History" \
        "curl -s -X GET '$BASE_URL/students/$STUDENT_ID/progression' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "progression" \
        "false"
fi

# Test 59: Delete Student (Soft Delete)
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$STUDENT_ID" ]; then
    run_test "Delete Student (Soft Delete)" \
        "curl -s -X DELETE '$BASE_URL/students/$STUDENT_ID' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "deleted successfully" \
        "false"
fi

# ================================================================================
# SECTION 4: STUDENT REPORTS TESTS
# ================================================================================

print_section "SECTION 4: STUDENT REPORTS TESTS"

# First, let's create a new student for report testing
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Create Student for Report Testing" \
        "curl -s -X POST '$BASE_URL/students' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"報告測試學生\",
            \"nameEn\":\"Report Test Student\",
            \"studentId\":\"2025010\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"grade\":\"P2\",
            \"class\":\"2A\",
            \"classNumber\":10
        }'" \
        "201" \
        "created successfully" \
        "false"
    
    # Extract the new student ID for report testing
    REPORT_STUDENT_ID=$(echo $response | grep -o '"_id":"[^"]*' | head -1 | grep -o '[^"]*)
fi

# Test 60: Create Student Report (Valid Data)
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_STUDENT_ID" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Create Student Report with Valid Data" \
        "curl -s -X POST '$BASE_URL/student-reports' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"student\":\"'$REPORT_STUDENT_ID'\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"reportDate\":\"2025-03-15T10:00:00.000Z\",
            \"term\":\"term2\",
            \"subject\":{
                \"name\":\"Mathematics\",
                \"code\":\"MATH\",
                \"teacher\":\"'$ADMIN_TOKEN'\"
            },
            \"subjectDetails\":{
                \"topic\":\"Addition and Subtraction\",
                \"duration\":45
            },
            \"performance\":{
                \"attendance\":{
                    \"status\":\"present\",
                    \"punctuality\":\"good\"
                },
                \"participation\":{
                    \"level\":\"good\",
                    \"engagement\":\"active\"
                },
                \"understanding\":{
                    \"level\":\"satisfactory\"
                }
            },
            \"homework\":{
                \"assigned\":true,
                \"details\":{
                    \"description\":\"Complete worksheet pages 10-12\"
                },
                \"completion\":{
                    \"status\":\"completed\",
                    \"quality\":\"good\"
                }
            },
            \"behavior\":{
                \"conduct\":\"good\",
                \"cooperation\":\"excellent\"
            },
            \"remarks\":{
                \"teacher_comments\":\"Student shows good progress in mathematics\"
            }
        }'" \
        "201" \
        "created successfully" \
        "false"
fi

# Test 61: Create Student Report for Non-existent Student
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Create Student Report for Non-existent Student" \
        "curl -s -X POST '$BASE_URL/student-reports' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"student\":\"000000000000000000000000\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"subject\":{\"name\":\"Test Subject\"},
            \"subjectDetails\":{\"topic\":\"Test Topic\"}
        }'" \
        "404" \
        "not found" \
        "true"
fi

# Test 62: Create Student Report with Invalid Academic Year
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_STUDENT_ID" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Create Student Report with Invalid Academic Year" \
        "curl -s -X POST '$BASE_URL/student-reports' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"student\":\"'$REPORT_STUDENT_ID'\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025-2026\",
            \"subject\":{\"name\":\"Test Subject\"},
            \"subjectDetails\":{\"topic\":\"Test Topic\"}
        }'" \
        "400" \
        "format YYYY/YY" \
        "true"
fi

# Test 63: Create Student Report with Missing Required Fields
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_STUDENT_ID" ]; then
    run_test "Create Student Report with Missing Required Fields" \
        "curl -s -X POST '$BASE_URL/student-reports' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"student\":\"'$REPORT_STUDENT_ID'\",
            \"academicYear\":\"2025/26\"
        }'" \
        "400" \
        "required" \
        "true"
fi

# Test 64: Get All Student Reports (Admin)
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Get All Student Reports (Admin)" \
        "curl -s -X GET '$BASE_URL/student-reports' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "reports" \
        "false"
fi

# Test 65: Get Single Student Report
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_ID" ]; then
    run_test "Get Single Student Report" \
        "curl -s -X GET '$BASE_URL/student-reports/$REPORT_ID' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "Mathematics" \
        "false"
fi

# Test 66: Get Reports by Student
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_STUDENT_ID" ]; then
    run_test "Get Reports by Student" \
        "curl -s -X GET '$BASE_URL/student-reports/student/$REPORT_STUDENT_ID' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "reports" \
        "false"
fi

# Test 67: Get My Reports (Teacher)
if [ ! -z "$TEACHER_TOKEN" ]; then
    run_test "Get My Reports (Teacher)" \
        "curl -s -X GET '$BASE_URL/student-reports/my-reports' -H 'Authorization: Bearer $TEACHER_TOKEN'" \
        "200" \
        "reports" \
        "false"
fi

# Test 68: Update Student Report
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_ID" ]; then
    run_test "Update Student Report" \
        "curl -s -X PUT '$BASE_URL/student-reports/$REPORT_ID' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"remarks\":{
                \"teacher_comments\":\"Updated comment: Student continues to show improvement\"
            }
        }'" \
        "200" \
        "updated successfully" \
        "false"
fi

# Test 69: Submit Report for Review
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_ID" ]; then
    run_test "Submit Report for Review" \
        "curl -s -X PUT '$BASE_URL/student-reports/$REPORT_ID/submit' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "submitted" \
        "false"
fi

# Test 70: Review Report (Admin Only)
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_ID" ]; then
    run_test "Review Report (Admin Only)" \
        "curl -s -X PUT '$BASE_URL/student-reports/$REPORT_ID/review' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "reviewed" \
        "false"
fi

# Test 71: Approve Report (Admin Only)
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_ID" ]; then
    run_test "Approve Report (Admin Only)" \
        "curl -s -X PUT '$BASE_URL/student-reports/$REPORT_ID/approve' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "approved" \
        "false"
fi

# Test 72: Get Report Statistics
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Get Report Statistics" \
        "curl -s -X GET '$BASE_URL/student-reports/stats' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "totalReports" \
        "false"
fi

# Test 73: Filter Reports by Academic Year
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Filter Reports by Academic Year" \
        "curl -s -X GET '$BASE_URL/student-reports?academicYear=2025%2F26' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "reports" \
        "false"
fi

# Test 74: Filter Reports by Subject
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Filter Reports by Subject" \
        "curl -s -X GET '$BASE_URL/student-reports?subject=Mathematics' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "reports" \
        "false"
fi

# Test 75: Delete Student Report
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_ID" ]; then
    run_test "Delete Student Report" \
        "curl -s -X DELETE '$BASE_URL/student-reports/$REPORT_ID' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "deleted successfully" \
        "false"
fi

# ================================================================================
# SECTION 5: MEETING RECORDS TESTS
# ================================================================================

print_section "SECTION 5: MEETING RECORDS TESTS"

# Test 76: Create Regular Meeting Record
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_STUDENT_ID" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Create Regular Meeting Record" \
        "curl -s -X POST '$BASE_URL/meeting-records' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"student\":\"'$REPORT_STUDENT_ID'\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"meetingType\":\"regular\",
            \"meetingTitle\":\"學期檢討會議\",
            \"meetingDate\":\"2025-03-15T10:00:00.000Z\",
            \"endTime\":\"15:30\",
            \"participants\":\"班主任、科任老師、家長\",
            \"meetingLocation\":\"會議室A\",
            \"senCategories\":[\"注意力不足/過度活躍症\"],
            \"meetingContent\":\"討論學生學習進度及行為表現，學生在課堂上專注力有所改善。\",
            \"remarks\":\"下次會議將繼續跟進進度\"
        }'" \
        "201" \
        "created successfully" \
        "false"
fi

# Test 77: Create IEP Meeting Record
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_STUDENT_ID" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Create IEP Meeting Record" \
        "curl -s -X POST '$BASE_URL/meeting-records' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"student\":\"'$REPORT_STUDENT_ID'\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"meetingType\":\"iep\",
            \"meetingTitle\":\"個別化教育計劃會議\",
            \"meetingDate\":\"2025-03-20T14:00:00.000Z\",
            \"endTime\":\"16:00\",
            \"participants\":\"班主任、特殊教育老師、心理學家、社工、家長\",
            \"meetingLocation\":\"特教資源室\",
            \"senCategories\":[\"注意力不足/過度活躍症\",\"特殊學習困難\"],
            \"meetingContent\":\"制定及檢討學生的個別化教育計劃，討論學習目標及支援策略。\",
            \"supportLevel\":\"第二層\",
            \"currentLearningStatus\":\"學生在數學科有明顯進步，但在中文閱讀理解方面仍需加強支援。\",
            \"curriculumAdaptation\":\"中文科採用分層教學，提供簡化版工作紙。\",
            \"teachingAdaptation\":\"課堂上提供視覺提示卡，延長作答時間。\"
        }'" \
        "201" \
        "created successfully" \
        "false"
fi

# Test 78: Create IEP Meeting without Support Level (Should Fail)
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_STUDENT_ID" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Create IEP Meeting without Support Level" \
        "curl -s -X POST '$BASE_URL/meeting-records' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"student\":\"'$REPORT_STUDENT_ID'\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"meetingType\":\"iep\",
            \"meetingTitle\":\"Invalid IEP Meeting\",
            \"meetingDate\":\"2025-03-15T10:00:00.000Z\",
            \"endTime\":\"15:30\",
            \"participants\":\"Test\",
            \"meetingLocation\":\"Test Room\",
            \"senCategories\":[\"沒有\"],
            \"meetingContent\":\"Test content\"
        }'" \
        "400" \
        "required" \
        "true"
fi

# Test 79: Create Meeting with Invalid SEN Categories
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_STUDENT_ID" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Create Meeting with Invalid SEN Categories" \
        "curl -s -X POST '$BASE_URL/meeting-records' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"student\":\"'$REPORT_STUDENT_ID'\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"meetingType\":\"regular\",
            \"meetingTitle\":\"Test Meeting\",
            \"meetingDate\":\"2025-03-15T10:00:00.000Z\",
            \"endTime\":\"15:30\",
            \"participants\":\"Test\",
            \"meetingLocation\":\"Test Room\",
            \"senCategories\":[\"Invalid Category\"],
            \"meetingContent\":\"Test content\"
        }'" \
        "400" \
        "Invalid SEN category" \
        "true"
fi

# Test 80: Create Meeting with Empty SEN Categories
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_STUDENT_ID" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Create Meeting with Empty SEN Categories" \
        "curl -s -X POST '$BASE_URL/meeting-records' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"student\":\"'$REPORT_STUDENT_ID'\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"meetingType\":\"regular\",
            \"meetingTitle\":\"Test Meeting\",
            \"meetingDate\":\"2025-03-15T10:00:00.000Z\",
            \"endTime\":\"15:30\",
            \"participants\":\"Test\",
            \"meetingLocation\":\"Test Room\",
            \"senCategories\":[],
            \"meetingContent\":\"Test content\"
        }'" \
        "400" \
        "At least one SEN category" \
        "true"
fi

# Test 81: Create Meeting with Invalid End Time Format
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_STUDENT_ID" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Create Meeting with Invalid End Time Format" \
        "curl -s -X POST '$BASE_URL/meeting-records' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"student\":\"'$REPORT_STUDENT_ID'\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"meetingType\":\"regular\",
            \"meetingTitle\":\"Test Meeting\",
            \"meetingDate\":\"2025-03-15T10:00:00.000Z\",
            \"endTime\":\"25:70\",
            \"participants\":\"Test\",
            \"meetingLocation\":\"Test Room\",
            \"senCategories\":[\"沒有\"],
            \"meetingContent\":\"Test content\"
        }'" \
        "400" \
        "HH:MM format" \
        "true"
fi

# Test 82: Get All Meeting Records
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Get All Meeting Records" \
        "curl -s -X GET '$BASE_URL/meeting-records' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "meetings" \
        "false"
fi

# Test 83: Get Single Meeting Record
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REGULAR_MEETING_ID" ]; then
    run_test "Get Single Meeting Record" \
        "curl -s -X GET '$BASE_URL/meeting-records/$REGULAR_MEETING_ID' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "學期檢討會議" \
        "false"
fi

# Test 84: Get Meetings by Student
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_STUDENT_ID" ]; then
    run_test "Get Meetings by Student" \
        "curl -s -X GET '$BASE_URL/meeting-records/student/$REPORT_STUDENT_ID' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "meetings" \
        "false"
fi

# Test 85: Get Meetings by Academic Year and School
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Get Meetings by Academic Year and School" \
        "curl -s -X GET '$BASE_URL/meeting-records/by-year/$SCHOOL_ID/2025%2F26' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "meetings" \
        "false"
fi

# Test 86: Filter Meetings by Type (Regular)
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Filter Meetings by Type (Regular)" \
        "curl -s -X GET '$BASE_URL/meeting-records?meetingType=regular' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "meetings" \
        "false"
fi

# Test 87: Filter Meetings by Type (IEP)
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Filter Meetings by Type (IEP)" \
        "curl -s -X GET '$BASE_URL/meeting-records?meetingType=iep' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "meetings" \
        "false"
fi

# Test 88: Update Meeting Record
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REGULAR_MEETING_ID" ]; then
    run_test "Update Meeting Record" \
        "curl -s -X PUT '$BASE_URL/meeting-records/$REGULAR_MEETING_ID' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"meetingTitle\":\"學期檢討會議 (已更新)\",
            \"remarks\":\"會議已更新 - 學生進步顯著\"
        }'" \
        "200" \
        "updated successfully" \
        "false"
fi

# Test 89: Get Meeting Statistics
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Get Meeting Statistics" \
        "curl -s -X GET '$BASE_URL/meeting-records/stats' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "totalMeetings" \
        "false"
fi

# Test 90: Test Meeting Pagination
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Test Meeting Pagination" \
        "curl -s -X GET '$BASE_URL/meeting-records?page=1&limit=1' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "pagination" \
        "false"
fi

# Test 91: Delete Meeting Record
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REGULAR_MEETING_ID" ]; then
    run_test "Delete Meeting Record" \
        "curl -s -X DELETE '$BASE_URL/meeting-records/$REGULAR_MEETING_ID' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "deleted successfully" \
        "false"
fi

# ================================================================================
# SECTION 6: AI ANALYSIS TESTS
# ================================================================================

print_section "SECTION 6: AI ANALYSIS TESTS"

# Test 92: Check AI Service Status
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Check AI Service Status" \
        "curl -s -X GET '$BASE_URL/ai-analysis/status' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "available" \
        "false"
fi

# Test 93: Get AI Analysis Statistics
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Get AI Analysis Statistics" \
        "curl -s -X GET '$BASE_URL/ai-analysis/stats' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "totalStudents" \
        "false"
fi

# Test 94: Extract Student Data without File (Should Fail)
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Extract Student Data without File" \
        "curl -s -X POST '$BASE_URL/ai-analysis/extract' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"schoolId\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\"
        }'" \
        "400" \
        "Please upload" \
        "true"
fi

# Test 95: Import Student Data with Invalid School
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Import Student Data with Invalid School" \
        "curl -s -X POST '$BASE_URL/ai-analysis/import' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"schoolId\":\"000000000000000000000000\",
            \"academicYear\":\"2025/26\",
            \"studentsData\":[]
        }'" \
        "404" \
        "not exist" \
        "true"
fi

# Test 96: Import Student Data with Empty Array
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Import Student Data with Empty Array" \
        "curl -s -X POST '$BASE_URL/ai-analysis/import' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"schoolId\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"studentsData\":[]
        }'" \
        "400" \
        "cannot be empty" \
        "true"
fi

# ================================================================================
# SECTION 7: SECURITY & PERMISSION TESTS
# ================================================================================

print_section "SECTION 7: SECURITY & PERMISSION TESTS"

# Test 97: Access Admin Route as Teacher (Should Fail)
if [ ! -z "$TEACHER_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Access Admin Route as Teacher (Delete School)" \
        "curl -s -X DELETE '$BASE_URL/schools/$SCHOOL_ID' -H 'Authorization: Bearer $TEACHER_TOKEN'" \
        "403" \
        "not authorized" \
        "true"
fi

# Test 98: SQL Injection Attempt in Student Name
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "SQL Injection Attempt in Student Name" \
        "curl -s -X POST '$BASE_URL/students' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"'; DROP TABLE students; --\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"grade\":\"P1\",
            \"class\":\"1A\",
            \"classNumber\":99
        }'" \
        "400" \
        "invalid" \
        "true"
fi

# Test 99: XSS Attempt in School Description
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "XSS Attempt in School Description" \
        "curl -s -X POST '$BASE_URL/schools' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"XSS Test School\",
            \"schoolType\":\"primary\",
            \"district\":\"Central and Western\",
            \"description\":\"<script>alert('XSS')</script>\"
        }'" \
        "201" \
        "created successfully" \
        "false"
fi

# Test 100: Invalid MongoDB ObjectID Format
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Invalid MongoDB ObjectID Format" \
        "curl -s -X GET '$BASE_URL/students/invalid-id-format' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "400" \
        "invalid" \
        "true"
fi

# Test 101: Malformed JSON Payload
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Malformed JSON Payload" \
        "curl -s -X POST '$BASE_URL/schools' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{\"name\":\"Test School\",\"schoolType\":\"primary\"' -w '\\n%{http_code}'" \
        "400" \
        "Invalid JSON" \
        "true"
fi

# Test 102: Oversized Payload (Large Description)
if [ ! -z "$ADMIN_TOKEN" ]; then
    LARGE_STRING=$(printf 'A%.0s' {1..2000})
    run_test "Oversized Payload (Large Description)" \
        "curl -s -X POST '$BASE_URL/schools' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"Large Description School\",
            \"schoolType\":\"primary\",
            \"district\":\"Central and Western\",
            \"description\":\"'$LARGE_STRING'\"
        }'" \
        "400" \
        "cannot exceed" \
        "true"
fi

# Test 103: Rate Limiting Test (Multiple Rapid Requests)
if [ ! -z "$ADMIN_TOKEN" ]; then
    echo "Testing Rate Limiting (5 rapid requests)..."
    for i in {1..5}; do
        curl -s -X GET "$BASE_URL/schools" -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
    done
    
    run_test "Rate Limiting Test (6th Request)" \
        "curl -s -X GET '$BASE_URL/schools' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "schools" \
        "false"
fi

# Test 104: CORS Header Test
run_test "CORS Header Test" \
    "curl -s -X OPTIONS '$BASE_URL/auth/login' -H 'Origin: http://localhost:3000' -H 'Access-Control-Request-Method: POST' -w '\\n%{http_code}'" \
    "200" \
    "" \
    "false"

# Test 105: Content-Type Header Validation
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Content-Type Header Validation (Missing)" \
        "curl -s -X POST '$BASE_URL/schools' -H 'Authorization: Bearer $ADMIN_TOKEN' -d '{\"name\":\"Test\"}'" \
        "400" \
        "Content-Type" \
        "true"
fi

# ================================================================================
# SECTION 8: EDGE CASES & ERROR HANDLING TESTS
# ================================================================================

print_section "SECTION 8: EDGE CASES & ERROR HANDLING TESTS"

# Test 106: Very Long Student Name (Boundary Test)
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    LONG_NAME="很長很長很長很長很長很長很長很長很長很長很長很長很長很長很長很長很長很長很長很長的學生姓名"
    run_test "Very Long Student Name (Boundary Test)" \
        "curl -s -X POST '$BASE_URL/students' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"'$LONG_NAME'\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"grade\":\"P1\",
            \"class\":\"1A\",
            \"classNumber\":88
        }'" \
        "400" \
        "cannot be more than 50" \
        "true"
fi

# Test 107: Student with Class Number 0 (Invalid)
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Student with Class Number 0 (Invalid)" \
        "curl -s -X POST '$BASE_URL/students' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"零號學生\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"grade\":\"P1\",
            \"class\":\"1A\",
            \"classNumber\":0
        }'" \
        "400" \
        "at least 1" \
        "true"
fi

# Test 108: Student with Class Number > 50 (Invalid)
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Student with Class Number > 50 (Invalid)" \
        "curl -s -X POST '$BASE_URL/students' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"超大號學生\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"grade\":\"P1\",
            \"class\":\"1A\",
            \"classNumber\":99
        }'" \
        "400" \
        "cannot be more than 50" \
        "true"
fi

# Test 109: Future Date of Birth (Invalid)
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    FUTURE_DATE=$(date -d "+1 year" +%Y-%m-%d)
    run_test "Future Date of Birth (Invalid)" \
        "curl -s -X POST '$BASE_URL/students' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"未來學生\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"grade\":\"P1\",
            \"class\":\"1A\",
            \"classNumber\":77,
            \"dateOfBirth\":\"'$FUTURE_DATE'\"
        }'" \
        "201" \
        "created successfully" \
        "false"
fi

# Test 110: Empty String Fields
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Empty String Fields" \
        "curl -s -X POST '$BASE_URL/students' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"grade\":\"P1\",
            \"class\":\"1A\",
            \"classNumber\":66
        }'" \
        "400" \
        "required" \
        "true"
fi

# Test 111: Unicode Characters in Student Name
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Unicode Characters in Student Name" \
        "curl -s -X POST '$BASE_URL/students' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"李明 👨‍🎓 emoji測試\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"grade\":\"P1\",
            \"class\":\"1A\",
            \"classNumber\":55
        }'" \
        "400" \
        "invalid characters" \
        "true"
fi

# Test 112: Null Values in Required Fields
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Null Values in Required Fields" \
        "curl -s -X POST '$BASE_URL/students' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":null,
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"grade\":\"P1\",
            \"class\":\"1A\",
            \"classNumber\":44
        }'" \
        "400" \
        "required" \
        "true"
fi

# Test 113: Meeting with Participants List Exceeding Limit
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_STUDENT_ID" ] && [ ! -z "$SCHOOL_ID" ]; then
    VERY_LONG_PARTICIPANTS=$(printf '參與者%.0s, ' {1..500})
    run_test "Meeting with Participants List Exceeding Limit" \
        "curl -s -X POST '$BASE_URL/meeting-records' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"student\":\"'$REPORT_STUDENT_ID'\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"meetingType\":\"regular\",
            \"meetingTitle\":\"超長參與者會議\",
            \"meetingDate\":\"2025-03-15T10:00:00.000Z\",
            \"endTime\":\"15:30\",
            \"participants\":\"'$VERY_LONG_PARTICIPANTS'\",
            \"meetingLocation\":\"會議室\",
            \"senCategories\":[\"沒有\"],
            \"meetingContent\":\"測試超長參與者列表\"
        }'" \
        "400" \
        "cannot exceed" \
        "true"
fi

# Test 114: Report with Assessment Score > 100
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_STUDENT_ID" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Report with Assessment Score > 100" \
        "curl -s -X POST '$BASE_URL/student-reports' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"student\":\"'$REPORT_STUDENT_ID'\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"subject\":{\"name\":\"Test Subject\"},
            \"subjectDetails\":{\"topic\":\"Test Topic\"},
            \"performance\":{
                \"assessment\":{
                    \"score\":150
                }
            }
        }'" \
        "400" \
        "cannot be more than 100" \
        "true"
fi

# Test 115: Report with Negative Assessment Score
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_STUDENT_ID" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Report with Negative Assessment Score" \
        "curl -s -X POST '$BASE_URL/student-reports' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"student\":\"'$REPORT_STUDENT_ID'\",
            \"school\":\"'$SCHOOL_ID'\",
            \"academicYear\":\"2025/26\",
            \"subject\":{\"name\":\"Test Subject\"},
            \"subjectDetails\":{\"topic\":\"Test Topic\"},
            \"performance\":{
                \"assessment\":{
                    \"score\":-10
                }
            }
        }'" \
        "400" \
        "cannot be negative" \
        "true"
fi

# ================================================================================
# SECTION 9: DATA CONSISTENCY & RELATIONSHIP TESTS
# ================================================================================

print_section "SECTION 9: DATA CONSISTENCY & RELATIONSHIP TESTS"

# Test 116: Create Student in Non-existent School
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Create Student in Non-existent School" \
        "curl -s -X POST '$BASE_URL/students' -H 'Authorization: Bearer $ADMIN_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"name\":\"孤兒學生\",
            \"school\":\"000000000000000000000000\",
            \"academicYear\":\"2025/26\",
            \"grade\":\"P1\",
            \"class\":\"1A\",
            \"classNumber\":33
        }'" \
        "404" \
        "not found" \
        "true"
fi

# Test 117: Create Report for Student in Different School
if [ ! -z "$TEACHER_TOKEN" ] && [ ! -z "$REPORT_STUDENT_ID" ]; then
    run_test "Create Report for Student in Different School (Teacher)" \
        "curl -s -X POST '$BASE_URL/student-reports' -H 'Authorization: Bearer $TEACHER_TOKEN' -H '$CONTENT_TYPE' -d '{
            \"student\":\"'$REPORT_STUDENT_ID'\",
            \"academicYear\":\"2025/26\",
            \"subject\":{\"name\":\"Mathematics\"},
            \"subjectDetails\":{\"topic\":\"Test Topic\"}
        }'" \
        "403" \
        "Not authorized" \
        "true"
fi

# Test 118: Try to Delete School with Active Students
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$SCHOOL_ID" ]; then
    run_test "Try to Delete School with Active Students" \
        "curl -s -X DELETE '$BASE_URL/schools/$SCHOOL_ID' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "400" \
        "active students" \
        "true"
fi

# Test 119: Access Student from Different School (Teacher)
if [ ! -z "$TEACHER_TOKEN" ] && [ ! -z "$REPORT_STUDENT_ID" ]; then
    run_test "Access Student from Different School (Teacher)" \
        "curl -s -X GET '$BASE_URL/students/$REPORT_STUDENT_ID' -H 'Authorization: Bearer $TEACHER_TOKEN'" \
        "403" \
        "Not authorized" \
        "true"
fi

# Test 120: Verify Academic History Tracking
if [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$REPORT_STUDENT_ID" ]; then
    run_test "Verify Academic History Tracking" \
        "curl -s -X GET '$BASE_URL/students/$REPORT_STUDENT_ID/progression' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "progression" \
        "false"
fi

# ================================================================================
# SECTION 10: CLEANUP TESTS
# ================================================================================

print_section "SECTION 10: CLEANUP AND FINAL TESTS"

# Test 121: Logout Admin User
if [ ! -z "$ADMIN_TOKEN" ]; then
    run_test "Logout Admin User" \
        "curl -s -X POST '$BASE_URL/auth/logout' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
        "200" \
        "successful" \
        "false"
fi

# Test 122: Logout Teacher User
if [ ! -z "$TEACHER_TOKEN" ]; then
    run_test "Logout Teacher User" \
        "curl -s -X POST '$BASE_URL/auth/logout' -H 'Authorization: Bearer $TEACHER_TOKEN'" \
        "200" \
        "successful" \
        "false"
fi

# Test 123: Access Protected Route After Logout
run_test "Access Protected Route After Logout" \
    "curl -s -X GET '$BASE_URL/auth/me' -H 'Authorization: Bearer $ADMIN_TOKEN'" \
    "401" \
    "token" \
    "true"

# Test 124: Server Health Check
run_test "Server Health Check" \
    "curl -s -X GET '$BASE_URL/health'" \
    "200" \
    "healthy" \
    "false"

# Test 125: API Overview Endpoint
run_test "API Overview Endpoint" \
    "curl -s -X GET '$BASE_URL/'" \
    "200" \
    "HK Teacher Student Management System API" \
    "false"

# Final summary
print_summary

echo ""
echo "🔍 Results Summary:"
echo "=================="
echo "📁 Results Directory: $RESULTS_DIR/"
echo "📊 Main Results File: $RESULTS_JSON"
echo "📋 Summary File: $SUMMARY_JSON"  
echo "🔍 Individual Test Files: $RESULTS_DIR/test_*.json"
echo "🔑 Extracted Data: $RESULTS_DIR/extracted_data.json"
echo ""
echo "🔧 How to view results:"
echo "cat $SUMMARY_JSON | jq '.' # View summary"
echo "cat $RESULTS_JSON | jq '.tests[] | select(.status==\"failed\")' # View failed tests"
echo "cat $RESULTS_JSON | jq '.summary' # View overall stats"
echo ""
echo "📊 Quick Stats:"

if command -v jq >/dev/null 2>&1; then
    echo "Passed: $(jq -r '.summary.passed' "$SUMMARY_JSON" 2>/dev/null || echo $PASS_COUNT)"
    echo "Failed: $(jq -r '.summary.failed' "$SUMMARY_JSON" 2>/dev/null || echo $FAIL_COUNT)"
    echo "Success Rate: $(jq -r '.summary.successRate' "$SUMMARY_JSON" 2>/dev/null || echo "N/A")"
else
    echo "Passed: $PASS_COUNT"
    echo "Failed: $FAIL_COUNT"
    echo "Success Rate: $([ $TEST_COUNT -gt 0 ] && echo "$(( (PASS_COUNT * 100) / TEST_COUNT ))%" || echo "0%")"
fi
echo ""
echo "🎯 Next Steps:"
echo "1. Review failed tests in the JSON files"
echo "2. Check server logs for detailed error messages"
echo "3. Fix any issues and re-run specific tests"
echo "4. Use extracted IDs to run manual tests if needed"
echo ""
echo "📁 Test completed at: $(date)"
echo "🔚 End of comprehensive backend testing"
echo ""