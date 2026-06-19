import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, render_template, jsonify

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def split_content_to_items(content_html):
    """
    Parses the entry content HTML and splits it by <h3> tags.
    Returns a list of dictionaries with 'type' and 'body'.
    """
    if not content_html:
        return []
        
    # Pattern to match <h3>Type</h3> and all content following it until the next <h3> or end of string
    pattern = re.compile(r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)', re.DOTALL)
    matches = pattern.findall(content_html)
    
    items = []
    for type_text, body_html in matches:
        # Strip HTML tags from type text just in case
        clean_type = re.sub('<[^<]+?>', '', type_text).strip()
        items.append({
            'type': clean_type,
            'body': body_html.strip()
        })
        
    # Fallback if no <h3> tags were found but there is content
    if not items and content_html.strip():
        items.append({
            'type': 'Update',
            'body': content_html.strip()
        })
        
    return items

def fetch_and_parse_feed():
    """
    Fetches the BigQuery XML Atom feed and parses it.
    """
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        req = urllib.request.Request(FEED_URL, headers=headers)
        # Timeout after 10 seconds
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
        
        root = ET.fromstring(xml_data)
        namespaces = {'ns': 'http://www.w3.org/2005/Atom'}
        
        entries = root.findall('ns:entry', namespaces)
        parsed_entries = []
        
        for entry in entries:
            title_el = entry.find('ns:title', namespaces)
            updated_el = entry.find('ns:updated', namespaces)
            content_el = entry.find('ns:content', namespaces)
            id_el = entry.find('ns:id', namespaces)
            
            title = title_el.text if title_el is not None else "No Date"
            updated = updated_el.text if updated_el is not None else ""
            content_html = content_el.text if content_el is not None else ""
            entry_id = id_el.text if id_el is not None else ""
            
            # Split the content into structured items (Features, Announcements, etc.)
            items = split_content_to_items(content_html)
            
            parsed_entries.append({
                'id': entry_id,
                'date': title, # Typically Google feed title is the date string, e.g., "June 17, 2026"
                'updated': updated,
                'items': items
            })
            
        return parsed_entries, None
    except Exception as e:
        return [], str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    releases, error = fetch_and_parse_feed()
    if error:
        return jsonify({'success': False, 'error': error}), 500
    return jsonify({'success': True, 'releases': releases})

if __name__ == '__main__':
    # Listen on localhost:5000 by default
    app.run(debug=True, host='127.0.0.1', port=5000)
