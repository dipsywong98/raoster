from typing import List
import requests


class FlareSolverr:
    def __init__(self, flaresolverr_url: str, callback_url: str):
        self.clean_cookies_dict = {}
        self.user_agent = ''
        self.callback_url = callback_url
        self.flaresolverr_url = flaresolverr_url

    def solve_challenge(self, url):
        print(f"1. creating session")
        post_body = {
            "cmd": "sessions.create",
            "session": "mm-test",
            "maxTimeout": 60000
        }

        response = requests.post(
            f'{self.flaresolverr_url}/v1',
            headers={'Content-Type': 'application/json'},
            json=post_body
        )
        response.raise_for_status()
        print(f"2. created session, solving challenge")

        post_body = {
            "cmd": "request.get",
            "session": "mm-test",
            "url": url,
            "maxTimeout": 60000
        }
        response = requests.post(
            f'{self.flaresolverr_url}/v1',
            headers={'Content-Type': 'application/json'},
            json=post_body
        )
        response.raise_for_status()
        print(f"3. solved challenge")

        json_response = response.json()
        cookies = json_response['solution']['cookies']
        self.clean_cookies_dict = {
            cookie['name']: cookie['value'] for cookie in cookies
        }
        self.user_agent = json_response['solution']['userAgent']

    def request(self, url: str):
        headers = {
            "User-Agent": self.user_agent,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }

        print(f"getting {url}")
        response = requests.get(
            url,
            headers=headers,
            cookies=self.clean_cookies_dict
        )
        print('status', response)
        response.raise_for_status()

        result = response.json()
        print(result)

        if self.callback_url is None:
            return
            
        print(f"trigger callback")
        response = requests.post(self.callback_url, json={
            "request_url": url,
            "header": dict(response.headers),
            "body": result,
        })

        print(response)
        response.raise_for_status()
        result = response.json()
        print(result)
        return result

    def chain_requests(self, urls: List[str]):
        for url in urls:
            result = self.request(url)
            if 'request_urls' in result:
                self.chain_requests(result['request_urls'])

if __name__ == '__main__':
    import argparse
    import os

    # parser = argparse.ArgumentParser()
    # parser.add_argument("--callback-url", required=True)
    # parser.add_argument("--request-urls", required=True)
    # parser.add_argument("--flaresolverr-url", required=True)
    # parser.add_argument("--solve-challenge-url", required=True)
    # args = parser.parse_args()

    flaresolverr_url = os.environ.get('FLARESOLVERR_URL')
    callback_url = os.environ.get('CALLBACK_URL')
    solve_challenge_url = os.environ.get('SOLVE_CHALLENGE_URL')
    request_urls = os.environ.get('REQUEST_URLS')


    fs = FlareSolverr(flaresolverr_url, callback_url)
    fs.solve_challenge(solve_challenge_url)
    fs.chain_requests(request_urls.split(','))
