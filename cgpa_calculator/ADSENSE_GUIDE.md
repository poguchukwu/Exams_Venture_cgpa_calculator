# Exams Venture - AdSense Publishing Instructions

To successfully apply for Google AdSense, follow these 3 steps:

## 1. Update your Publisher ID
I have added the standard AdSense code to your files, but you must replace the placeholder ID (`ca-pub-XXXXXXXXXXXXXXXX`) with your actual AdSense Publisher ID.
- Open `index.html` and `calculator.html`.
- Find `ca-pub-XXXXXXXXXXXXXXXX` and replace it with your ID (found in your AdSense Dashboard).

## 2. Create an `ads.txt` file
Google requires an `ads.txt` file in your root folder to verify you own the site.
- Create a file named `ads.txt` in your project folder.
- Paste this line inside it (replace with your ID):
  `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`

## 3. Policy Compliance Checklist
I have already implemented the following to ensure you don't get rejected:
- **High-Value Content**: The new "Academic Guide" (600+ words) provides the textual depth Google requires.
- **Clear Labeling**: Ad units are now labeled with "ADVERTISEMENT" to avoid confusing users.
- **No Policy Violations**: I've confirmed there are no auto-refreshing ads or hidden ad units.
- **PWA Compatibility**: The Service Worker is configured to not interfere with ad delivery.

Once you have updated the IDs, push your code to GitHub and submit your site for review in the AdSense console.
