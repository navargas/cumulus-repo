# REST Interface

```bash
AUTH='--header "X-API-KEY: <API-KEY>"'
URL=???

# Create new asset:
curl $AUTH -X PUT $URL/assets/<assetName> -d 'desc=Optional description here'

# Upload new version:
curl $AUTH -X PUT $URL/assets/<assetName>/<assetVersion> --data-binary "@path/to/file"

# Get information about an assets:
curl $AUTH $URL/assets/<assetName>

# Download an asset:
curl $AUTH $URL/assets/<assetName>/<assetVersion>

# Search for an asset:
curl $AUTH $URL/assets/?search=keyword

# Create new group:
curl $AUTH -X PUT $URL/groups/<groupName>

# View members of a group:
curl $AUTH $URL/groups/<groupName>/members/

# Add member to a group:
curl $AUTH -X PUT $URL/groups/<groupName>/members/<username>

# Associate group with an asset:
curl $AUTH -X PUT $URL/assets/<assetName>/groups/<groupName>
```
