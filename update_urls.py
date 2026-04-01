import os
import glob
import re

src_dir = '/Users/snehithbudati/Desktop/policy-chatbot/frontend/src'
files = glob.glob(os.path.join(src_dir, '*.js'))

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Handle template literals with variables e.g. `http://localhost:5001/admin/chats/user/${...}`
    content = re.sub(
        r'`http://localhost:5001([^`]*?)`',
        r'`${process.env.REACT_APP_API_URL || "http://localhost:5001"}\1`',
        content
    )
    
    # Handle strings e.g. "http://localhost:5001/upload"
    content = re.sub(
        r'"http://localhost:5001([^"]*?)"',
        r'`${process.env.REACT_APP_API_URL || "http://localhost:5001"}\1`',
        content
    )
    
    with open(filepath, 'w') as f:
        f.write(content)

print("Updated URLs in React frontend.")
