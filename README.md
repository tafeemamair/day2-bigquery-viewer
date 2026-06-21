# BigQuery Release Notes Viewer

A modern web application built with Python Flask that fetches, parses, and displays the latest Google BigQuery release notes from the official XML feed.

## Overview

This application provides an easy-to-use interface for tracking BigQuery updates, feature releases, announcements, issues, and breaking changes. It automatically retrieves release notes from Google's official feed and presents them in a clean, organized dashboard.

## Features

* Fetches release notes from the official Google BigQuery release notes feed
* Real-time update tracking
* Search and filter functionality
* Category-based organization
* Responsive and modern user interface
* Manual refresh capability
* Cached data for improved performance
* Release notes grouped by date
* Quick access to official documentation links

## Technologies Used

### Backend

* Python 3
* Flask
* Requests
* XML ElementTree

### Frontend

* HTML5
* CSS3
* Vanilla JavaScript

### Data Source

* Google BigQuery Release Notes XML Feed

## Project Structure

```text
day2/
├── app.py
├── requirements.txt
├── templates/
│   └── index.html
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── main.js
└── __pycache__/
```

## Installation

### Clone the repository

```bash
git clone https://github.com/tafeemamair/day2-bigquery-viewer.git
cd day2-bigquery-viewer
```

### Create a virtual environment

```bash
python -m venv .venv
```

### Activate the virtual environment

Windows:

```bash
.venv\Scripts\activate
```

Linux/macOS:

```bash
source .venv/bin/activate
```

### Install dependencies

```bash
pip install -r requirements.txt
```

### Run the application

```bash
python app.py
```

Open your browser and navigate to:

```text
http://127.0.0.1:5000
```

## Screenshot

<img width="1882" height="1072" alt="Screenshot" src="https://github.com/user-attachments/assets/e81130a4-2a98-4242-abf7-76066ad29681" />


Example:

```markdown
![BigQuery Release Notes Viewer](screenshot.png)
```

## Learning Objectives

This project demonstrates:

* Agent-assisted software development using Google Antigravity
* Flask web application development
* XML feed parsing
* REST data retrieval
* Frontend and backend integration
* Git and GitHub workflow
* Rapid prototyping with AI agents

## Future Improvements

* User authentication
* Bookmark favorite updates
* Email notifications for new releases
* Advanced filtering and sorting
* Export release notes to CSV/PDF
* Dark and light theme support
* Deployment to cloud platforms

## Author

**Aisan Tafeem Amair**

GitHub: https://github.com/tafeemamair

## License

This project is provided for educational and portfolio purposes.
