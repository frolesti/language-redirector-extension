import requests
from bs4 import BeautifulSoup

def check_lang_attribute(url):
    try:
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.content, 'html.parser')
        html_tag = soup.find('html')
        lang = html_tag.get('lang') if html_tag else "Not found"
        print(f"URL: {url} -> HTML lang attribute: {lang}")
    except Exception as e:
        print(f"Error checking {url}: {e}")

check_lang_attribute('https://www.irta.cat/')
check_lang_attribute('https://www.irta.cat/es/')
check_lang_attribute('https://www.irta.cat/en/')
