# assets

## REST Interface

```bash
AUTH="X-API-KEY: <API-KEY>"
URL=???

# Create new asset:
curl -H "$AUTH" -X PUT $URL/assets/<assetName> -d 'desc=Optional description here'

# Upload new version:
curl -H "$AUTH" -X PUT $URL/assets/<assetName>/<assetVersion> --data-binary "@path/to/file"

# Get information about an assets:
curl -H "$AUTH" $URL/assets/<assetName>

# Download an asset:
curl -H "$AUTH" $URL/assets/<assetName>/<assetVersion>

# Search for an asset:
curl -H "$AUTH" $URL/assets/?search=keyword

# Create new group:
curl -H "$AUTH" -X PUT $URL/groups/<groupName>

# View members of a group:
curl -H "$AUTH" $URL/groups/<groupName>/members/

# Add member to a group:
curl -H "$AUTH" -X PUT $URL/groups/<groupName>/members/<username>

# Associate group with an asset:
curl -H "$AUTH" -X PUT $URL/assets/<assetName>/groups/<groupName>
```
