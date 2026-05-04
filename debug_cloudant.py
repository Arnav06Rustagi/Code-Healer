"""Debug Cloudant connection and history storage."""
import os, uuid, json
from datetime import datetime, timezone
from dotenv import load_dotenv
load_dotenv()

from ibmcloudant.cloudant_v1 import CloudantV1
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator

url = os.getenv("CLOUDANT_URL", "")
apikey = os.getenv("CLOUDANT_APIKEY", "")
db = os.getenv("CLOUDANT_DB", "code_healer_history")

print(f"DB: {db}")
print(f"URL ends with: ...{url[-40:]}")

auth = IAMAuthenticator(apikey)
client = CloudantV1(authenticator=auth)
client.set_service_url("https://" + url.split("@")[-1])

# 1. List all docs
print("\n=== All docs in DB ===")
result = client.post_all_docs(db=db, include_docs=True).get_result()
rows = result.get("rows", [])
print(f"Total docs: {len(rows)}")
for r in rows[:5]:
    doc = r.get("doc", {})
    did = doc.get("_id", "?")[:30]
    dtype = doc.get("type", "?")
    dlang = doc.get("language", "?")
    print(f"  id={did}  type={dtype}  lang={dlang}")

# 2. Save a test doc
test_id = str(uuid.uuid4())
test_doc = {
    "_id": test_id,
    "type": "review",
    "code": "print('hello')",
    "language": "python",
    "score": 8,
    "summary": "Test review from debug script",
    "review": {"score": 8, "summary": "Test", "issues": [], "suggestions": [], "fixed_code": "print('hello')"},
    "preview": "print('hello')",
    "created_at": datetime.now(timezone.utc).isoformat(),
}
try:
    res = client.post_document(db=db, document=test_doc).get_result()
    print(f"\n=== Saved test doc: ok={res.get('ok')} ===")
except Exception as e:
    print(f"\n=== Save FAILED: {e} ===")

# 3. Try post_find WITH sort
print("\n=== post_find WITH sort ===")
try:
    find_result = client.post_find(
        db=db,
        selector={"type": "review"},
        fields=["_id", "_rev", "language", "score", "preview", "summary", "created_at"],
        sort=[{"created_at": "desc"}],
        limit=30,
    ).get_result()
    docs = find_result.get("docs", [])
    print(f"Found: {len(docs)} docs")
    for d in docs[:3]:
        print(f"  score={d.get('score')}  lang={d.get('language')}  time={d.get('created_at','?')[:19]}")
except Exception as e:
    print(f"FAILED: {e}")

# 4. Try post_find WITHOUT sort
print("\n=== post_find WITHOUT sort ===")
try:
    find_result2 = client.post_find(
        db=db,
        selector={"type": "review"},
        fields=["_id", "_rev", "language", "score", "preview", "summary", "created_at"],
        limit=30,
    ).get_result()
    docs2 = find_result2.get("docs", [])
    print(f"Found: {len(docs2)} docs")
    for d in docs2[:3]:
        print(f"  score={d.get('score')}  lang={d.get('language')}  time={d.get('created_at','?')[:19]}")
except Exception as e:
    print(f"FAILED: {e}")

# 5. Cleanup test doc
try:
    doc = client.get_document(db=db, doc_id=test_id).get_result()
    client.delete_document(db=db, doc_id=test_id, rev=doc["_rev"]).get_result()
    print("\n=== Cleaned up test doc ===")
except:
    pass
