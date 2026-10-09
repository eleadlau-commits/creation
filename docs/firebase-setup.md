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
   pay-as-you-go **Blaze** plan and add a card. Personal use of Creation stays well
   inside the free allowance, so normally nothing is charged, but check the current
   Firebase pricing page, and consider setting a budget alert in Google Cloud.
2. Use the same location as the database if offered, and production mode.
3. **Storage → Rules**: replace everything with the contents of `storage.rules`, then **Publish**.

## If something goes wrong

Creation shows a plain message in **Settings → Account**:

- *"This website isn't allowed to sign in yet"*: step 4 is missing the site's address.
- *"This way of signing in isn't switched on yet"*: step 3.
- Signing in works but syncing fails with "permission denied": step 6 (rules not published).
