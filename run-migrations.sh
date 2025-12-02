#!/bin/bash
# run-migrations.sh
# Script to execute migrations using custom runner

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  🗃️  RUN MIGRATIONS - EDWISE${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
echo ""

# Verify directory
if [ ! -d "server" ]; then
    echo -e "${RED}❌ Please run from the project root (where 'server' folder exists)${NC}"
    exit 1
fi

# Status before
echo -e "${CYAN}📋 Current Status:${NC}"
node server/scripts/migrate.js status
echo ""

# Execute
echo -e "${YELLOW}▶️  Running pending migrations...${NC}"
echo ""

if node server/scripts/migrate.js up; then
    echo ""
    echo -e "${GREEN}✅ Migrations executed!${NC}"
    echo ""
    echo -e "${CYAN}📋 Updated Status:${NC}"
    node server/scripts/migrate.js status
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ Done! Migrations applied successfully${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
else
    echo ""
    echo -e "${RED}❌ Error executing migrations${NC}"
    echo ""
    echo -e "${YELLOW}Tips:${NC}"
    echo "  - Check .env file"
    echo "  - Check database connection"
    exit 1
fi

echo ""
