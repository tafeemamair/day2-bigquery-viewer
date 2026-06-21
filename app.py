import time
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_updated": 0
}
CACHE_DURATION_SECS = 3600  # 1 hour

def fetch_and_parse_feed(force=False):
    now = time.time()
    if not force and cache["data"] is not None and (now - cache["last_updated"]) < CACHE_DURATION_SECS:
        return cache["data"], "cache"
    
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        xml_data = response.text
        
        # Parse XML
        root = ET.fromstring(xml_data)
        namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
        
        parsed_entries = []
        for entry in root.findall('atom:entry', namespaces):
            entry_id_elem = entry.find('atom:id', namespaces)
            entry_id = entry_id_elem.text if entry_id_elem is not None else str(time.time())
            
            title_elem = entry.find('atom:title', namespaces)
            date_str = title_elem.text if title_elem is not None else ""
            
            updated_elem = entry.find('atom:updated', namespaces)
            updated_str = updated_elem.text if updated_elem is not None else ""
            
            link_elem = entry.find("atom:link[@rel='alternate']", namespaces)
            link = link_elem.attrib.get('href') if link_elem is not None else 'https://docs.cloud.google.com/bigquery/docs/release-notes'
            
            content_elem = entry.find('atom:content', namespaces)
            content_html = content_elem.text if content_elem is not None else ''
            
            # Parse html content inside this entry
            soup = BeautifulSoup(content_html, 'html.parser')
            
            current_category = 'General'
            current_parts = []
            entry_updates = []
            idx = 0
            
            for child in soup.contents:
                if child.name == 'h3':
                    if current_parts or current_category != 'General':
                        html_content = ''.join(str(c) for c in current_parts).strip()
                        if html_content:
                            text_content = BeautifulSoup(html_content, 'html.parser').get_text().strip()
                            entry_updates.append({
                                'id': f"{entry_id}_{idx}",
                                'category': current_category,
                                'content': html_content,
                                'text': text_content
                            })
                            idx += 1
                    current_category = child.get_text().strip()
                    current_parts = []
                else:
                    current_parts.append(child)
            
            if current_parts or current_category != 'General':
                html_content = ''.join(str(c) for c in current_parts).strip()
                if html_content:
                    text_content = BeautifulSoup(html_content, 'html.parser').get_text().strip()
                    entry_updates.append({
                        'id': f"{entry_id}_{idx}",
                        'category': current_category,
                        'content': html_content,
                        'text': text_content
                    })
                    idx += 1
            
            # If no updates were parsed (empty content), create one default entry
            if not entry_updates and content_html.strip():
                text_content = soup.get_text().strip()
                entry_updates.append({
                    'id': f"{entry_id}_0",
                    'category': 'General',
                    'content': content_html,
                    'text': text_content
                })
            
            parsed_entries.append({
                'date': date_str,
                'updated': updated_str,
                'link': link,
                'updates': entry_updates
            })
            
        cache["data"] = parsed_entries
        cache["last_updated"] = now
        return parsed_entries, "fresh"
    except Exception as e:
        print(f"Error fetching feed: {e}")
        # If fetch fails but we have stale cache, return stale cache
        if cache["data"] is not None:
            return cache["data"], "stale"
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force = request.args.get('refresh', 'false').lower() == 'true'
    try:
        data, source = fetch_and_parse_feed(force=force)
        return jsonify({
            'success': True,
            'source': source,
            'timestamp': cache['last_updated'],
            'data': data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
