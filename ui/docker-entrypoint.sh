#!/bin/sh

# Create a JavaScript file with environment variables
cat > /usr/share/nginx/html/env-config.js << EOF
window.ENV = {
  VITE_SUPPORTED_CHAINS: '${VITE_SUPPORTED_CHAINS}'
};
EOF

# Start nginx
exec "$@"