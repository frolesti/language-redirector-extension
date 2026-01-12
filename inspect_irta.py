import requests
from bs4 import BeautifulSoup

def analyze_url(url):
    print(f"--- Analyzing {url} ---")
    try:
        response = requests.get(url, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"History: {response.history}")
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Check hreflang tags
        alternates = soup.find_all('link', rel='alternate')
        print("Hreflang tags:")
        for link in alternates:
            print(f"  hreflang={link.get('hreflang')}: {link.get('href')}")
            
        # Check Language Switcher
        # Assuming common patterns for language switchers
        print("Potential Language Switcher links:")
        for a in soup.find_all('a'):
            text = a.get_text(strip=True).lower()
            href = a.get('href')
            if text in ['català', 'cat', 'ca', 'catalan']:
                print(f"  Text='{a.get_text(strip=True)}', Href='{href}', Class: {a.get('class')}")
            if href and ('/ca/' in href or href.endswith('/ca')):
                 # Double check if it looks like a switcher
                 if any(cls in (a.get('class') or []) for cls in ['lang', 'language', 'switcher']):
                     print(f"  (heuristic) Text='{a.get_text(strip=True)}', Href='{href}', Class: {a.get('class')}")

        return response.url
        
    except Exception as e:
        print(f"Error: {e}")
        return None

# 1, 2, 3. Analyze ES version
analyze_url('https://www.irta.cat/es/')

# 4. Check CA version specific URL
analyze_url('https://www.irta.cat/ca/')

# 5. Check Root URL
final_root_url = analyze_url('https://www.irta.cat/')
print(f"Root URL resolved to: {final_root_url}")
