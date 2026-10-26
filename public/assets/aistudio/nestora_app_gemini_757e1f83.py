import http.server
import socketserver
import json
import sqlite3
from datetime import datetime

PORT = 8000

class NestoraAppHandler(http.server.SimpleHTTPRequestHandler):
    
    def do_POST(self):
        # Jab frontend /api/export-data par request bhejega
        if self.path == '/api/export-data':
            try:
                # Request ka content-length padhein
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                
                # JSON data decode karein
                request_json = json.loads(post_data.decode('utf-8'))
                print("[BACKEND RECEIVED DATA]:", request_json)
                
                # --- SQLite Database mein save karne ka logic ---
                conn = sqlite3.connect('nestora_offline.db')
                cursor = conn.cursor()
                
                # Table create agar pehle se na ho
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS case_exports (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        action TEXT,
                        timestamp TEXT,
                        details TEXT
                    )
                ''')
                
                # Data insert karein
                cursor.execute('''
                    INSERT INTO case_exports (action, timestamp, details)
                    VALUES (?, ?, ?)
                ''', (
                    request_json.get('action', 'unknown'),
                    request_json.get('timestamp', str(datetime.now())),
                    json.dumps(request_json)
                ))
                
                conn.commit()
                conn.close()
                
                # Frontend ko success response bhejna
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                
                response_response = {
                    "status": "success",
                    "message": "Data successfully processed and saved to SQLite database!"
                }
                self.wfile.write(json.dumps(response_response).encode('utf-8'))
                
            except Exception as e:
                print("[ERROR]:", str(e))
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                error_response = {"status": "error", "message": str(e)}
                self.wfile.write(json.dumps(error_response).encode('utf-8'))
        else:
            # Agar koi aur path ho toh 404 bhej dein
            self.send_response(404)
            self.end_headers()

# Server start karne ka code
if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), NestoraAppHandler) as httpd:
        print(f"\n[NESTORA APP RUNNING] -> http://localhost:{PORT}")
        print("Open this link in your browser to use your app locally!")
        print("Press Ctrl+C in the terminal to stop the app.\n")
        httpd.serve_forever()