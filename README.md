# 🛡️ BigQuery Release Sentinel

<p align="center">
  <img src="https://img.shields.io/badge/Built%20With-Antigravity%20CLI-blueviolet?style=for-the-badge" alt="Antigravity CLI">
  <img src="https://img.shields.io/badge/Event-Kaggle%20Workshop-blue?style=for-the-badge&logo=kaggle" alt="Kaggle Workshop">
  <img src="https://img.shields.io/badge/Framework-Flask-black?style=for-the-badge&logo=flask" alt="Flask">
</p>

---

## 📝 Overview
**BigQuery Release Sentinel** is a sleek, local web application designed to track, parse, and read Google Cloud BigQuery release notes efficiently. It utilizes a custom tag-based splitter to seamlessly organize updates into a clean, responsive user interface.

## 🎓 Context & Origin
This project was developed as a hands-on exercise during the **Kaggle Workshop**. The entire development lifecycle—including environment tracking, configuration, code verification, and deployment workflows—was managed and automated using the **Antigravity CLI**.

---

## 🚀 Key Features
* **Automated Parsing:** Built-in logic to handle and split complex release note data using custom tag structures.
* **Modern Web Interface:** Clean HTML5 interface styled with custom CSS for maximum readability.
* **Dynamic Frontend:** Interactive script logic powered by lightweight JavaScript (`app.js`).
* **Environment Safeguards:** Optimized with a strict `.gitignore` configured via Conda to isolate virtual environments.

## 🛠️ Tech Stack
* **Backend:** Python / Flask
* **Frontend:** HTML5, CSS3, JavaScript
* **CLI tooling:** Antigravity CLI
* **Environment & Package Management:** Miniconda3 / Conda

---

## 📦 Project Structure
```text
bq-release-notes/
├── app.py                 # Core Flask backend and parsing logic
├── templates/
│   └── index.html         # Main structural layout of the reader
└── static/
    ├── style.css          # Custom typography and layout styling
    └── app.js             # Frontend interactions and UI components
