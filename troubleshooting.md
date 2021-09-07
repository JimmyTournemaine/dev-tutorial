# Troubleshooting

## Docker

* **Issue:** Error building *image*: no space left on device
* **Solution:** Remove any unnecessary Docker objects from you system.

You can run the following command  :
```bash
$DEVTUTO_COMPOSE prune -f
```
---
* **Issue:** Error creating container: UnixHTTPConnectionPool(host='localhost', port=None): Read timed out
* **Solution:** Retry one more time. If the trouble persists, restart the docker daemon and try again.
