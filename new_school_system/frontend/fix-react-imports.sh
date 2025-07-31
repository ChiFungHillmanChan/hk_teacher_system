#!/bin/bash
cd frontend/src

# Remove React imports from files that don't use React features like createContext, Component, etc.
find . -name "*.jsx" -type f | while read file; do
  # Check if file uses React features (not just JSX)
  if grep -q "React\." "$file" || grep -q "createContext\|Component\|useState\|useEffect\|useContext\|useReducer\|useCallback\|useMemo\|useRef" "$file"; then
    echo "Keeping React import in: $file"
  else
    # Remove React import line
    sed -i '' '/^import React/d' "$file"
    echo "Removed React import from: $file"
  fi
done

echo "React import cleanup complete!"