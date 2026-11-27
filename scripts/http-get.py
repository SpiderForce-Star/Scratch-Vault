"""Private one-shot download. Prints status, content-type, and byte count. Body goes to dest."""

import sys
import urllib.error
import urllib.request

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)


def main() -> None:
    url = sys.argv[1]
    dest = sys.argv[2]
    method = "GET"
    data = None
    headers = {
        "User-Agent": UA,
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
    }
    if len(sys.argv) > 3:
        method = "POST"
        data = sys.argv[3].encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            body = res.read(9_000_000)
            with open(dest, "wb") as handle:
                handle.write(body)
            print(res.status)
            print(res.headers.get("content-type") or "")
            print(len(body))
    except urllib.error.HTTPError as err:
        print(err.code)
        print(err.headers.get("content-type") or "" if err.headers else "")
        print(0)
    except Exception as err:
        print(0)
        print(type(err).__name__)
        print(0)


if __name__ == "__main__":
    main()
