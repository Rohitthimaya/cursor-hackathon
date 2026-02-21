#!/bin/bash
# Create Jethalal messages collection in Zilliz Cloud / Milvus
# Run: ./scripts/create-milvus-collection.sh
# Requires: VECTOR_DB_URL and VECTOR_DB_API_KEY in .env (or export them)

set -e
cd "$(dirname "$0")/.."
[ -f .env ] && export $(grep -v '^#' .env | xargs)

: "${VECTOR_DB_URL:?Set VECTOR_DB_URL and VECTOR_DB_API_KEY in .env}"
: "${VECTOR_DB_API_KEY:?Set VECTOR_DB_API_KEY in .env}"

# Embedding dimension: 1536 for OpenAI text-embedding-ada-002, 384 for text-embedding-3-small
DIM=${VECTOR_DB_EMBEDDING_DIM:-1536}

curl --request POST \
  --url "${VECTOR_DB_URL}/v2/vectordb/collections/create" \
  --header "Authorization: Bearer ${VECTOR_DB_API_KEY}" \
  --header "Content-Type: application/json" \
  --data "{
    \"collectionName\": \"jethalal_messages\",
    \"schema\": {
      \"autoId\": true,
      \"enabledDynamicField\": false,
      \"fields\": [
        {
          \"fieldName\": \"id\",
          \"dataType\": \"Int64\",
          \"isPrimary\": true,
          \"autoId\": true
        },
        {
          \"fieldName\": \"group_id\",
          \"dataType\": \"VarChar\",
          \"elementTypeParams\": { \"max_length\": \"128\" }
        },
        {
          \"fieldName\": \"message_id\",
          \"dataType\": \"VarChar\",
          \"elementTypeParams\": { \"max_length\": \"256\" }
        },
        {
          \"fieldName\": \"content\",
          \"dataType\": \"VarChar\",
          \"elementTypeParams\": { \"max_length\": \"4096\" }
        },
        {
          \"fieldName\": \"embedding\",
          \"dataType\": \"FloatVector\",
          \"elementTypeParams\": { \"dim\": \"${DIM}\" }
        },
        {
          \"fieldName\": \"timestamp\",
          \"dataType\": \"VarChar\",
          \"elementTypeParams\": { \"max_length\": \"64\" }
        },
        {
          \"fieldName\": \"user_id\",
          \"dataType\": \"VarChar\",
          \"elementTypeParams\": { \"max_length\": \"128\" }
        },
        {
          \"fieldName\": \"user_name\",
          \"dataType\": \"VarChar\",
          \"elementTypeParams\": { \"max_length\": \"128\" }
        },
        {
          \"fieldName\": \"platform\",
          \"dataType\": \"VarChar\",
          \"elementTypeParams\": { \"max_length\": \"32\" }
        }
      ]
    },
    \"indexParams\": [
      { \"fieldName\": \"id\", \"indexType\": \"AUTOINDEX\" },
      { \"fieldName\": \"embedding\", \"indexType\": \"AUTOINDEX\", \"metricType\": \"COSINE\" }
    ]
  }"

echo ""
echo "Collection jethalal_messages created (or already exists)."
