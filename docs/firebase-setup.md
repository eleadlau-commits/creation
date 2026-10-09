# Setting up accounts (Firebase)

Signing in to Creation is optional. These steps connect Creation to your own free
Firebase project, so you can sign in and (from the next updates) keep your work in
your account across devices. It takes about 15 minutes. Firebase's screens change
from time to time; if a name below doesn't match exactly, look for the nearest one.

## 1. Create the project

1. Go to <https://console.firebase.google.com> and sign in with your Google account.
2. Click **Create a project**, name it (for example `creation`), and finish.
   Google Analytics isn't needed; you can switch it off.

## 2. Register Creation as a web app

1. On the project's overview page, click the web icon **`</>`**.
2. Nickname: `Creation web`. Leave **Firebase Hosting** unticked. Click **Register app**.
3. Copy the `firebaseConfig` values it shows into `js/storage/firebase-config.js`.
   These values are public by design. Your data is protected by the rules in step 6.

## 3. Switch on the ways to sign in

**Build → Authentication → Get started → Sign-in method:**

- **Google**: turn on, choose your email as the support email, save.
- **Email/Password**: turn on both switches, **Email/Password** and
  **Email link (passwordless sign-in)**. Creation only uses the email link.

## 4. Allow your website to sign in

**Authentication → Settings → Authorised domains → Add domain:**

- `eleadlau-commits.github.io` (your GitHub Pages address)
- any custom domain you use for the site
- `localhost` is already there (for trying Creation on your own computer)

## 5. Create the database

**Build → Firestore Database → Create database:**

- Edition: **Standard** if asked.
- Location: one near you (for example `asia-northeast1`, Tokyo). It can't be changed later.
- Start in **production mode** (everything locked until the rules below are added).

## 6. Paste in the security rules

These make sure only you can read or write your own data.

1. Open the file `firestore.rules` from this repository and copy all of it.
2. **Firestore Database → Rules**: replace everything there with it, then **Publish**.

## 7. Images (Cloud Storage), needed for syncing images

1. **Build → Storage → Get started.** Firebase may ask you to switch to the
   pay-as-you-go **Blaze** plan and add a card. Personal use of Creation normally stays
   inside the free allowance, but check Firebase's current pricing page.
2. **Location:** Firebase's free allowance for Storage has applied only to buckets in
   some US locations (`us-central1`, `us-east1`, `us-west1`). Check the note on that
   screen and pick a free one if it says so. It can't be changed later.
3. Start in **production mode**.
4. **Storage → Rules**: replace everything with the contents of `storage.rules`, then **Publish**.

### Let your site download images (CORS)

Without this, synced images still show while online, but can't be kept on the device
for offline use. Done once:

1. Open <https://console.cloud.google.com/?project=YOUR-PROJECT-ID> and click the
   Cloud Shell icon **`>_`** (top right). Authorise it if asked.
2. Paste this, with your site's address and your bucket name (it's the
   `storageBucket` value in `js/storage/firebase-config.js`), and press Enter:

```
cat > cors.json <<'JSON'
[{"origin": ["https://eleadlau-commits.github.io", "http://localhost:8000"], "method": ["GET"], "maxAgeSeconds": 3600}]
JSON
gcloud storage buckets update gs://creation-ba12c.firebasestorage.app --cors-file=cors.json
```

If it says no project is set, run `gcloud config set project YOUR-PROJECT-ID` first.
This only allows reading, only from your site; the storage rules still decide whose files
can be read. If you add a custom domain later, add it to the list and run it again.

### A budget alert (recommended with Blaze)

<https://console.cloud.google.com/billing> → your billing account → **Budgets & alerts**
→ **Create budget**. Choose this project, an amount such as $1, and keep the email
alerts. You'll get an email if costs ever start; nothing is stopped automatically.

## If something goes wrong

Creation shows a plain message in **Settings → Account**:

- *"This website isn't allowed to sign in yet"*: step 4 is missing the site's address.
- *"This way of signing in isn't switched on yet"*: step 3.
- Signing in works but syncing fails with "permission denied": step 6 (rules not published).
- Images don't appear on other devices: step 7 (Storage set up and its rules published).
- Images appear on other devices but not offline: the CORS step in 7.
