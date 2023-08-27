# Written Proof of Work

This is an example implementation of written proof of work for validating the edit history of written text. The purpose of written proof of work is to verify that text is indeed written by a human. To accomplish this, we utilize recorded history and timestamp authority servers. Every 20 seconds the hash of the previous edits are sent to a timestamp authority server to be validated. What this essentially enables is rate throttling for written text. Additionally the edit history can be analyzed with heuristics to determine whether or not the text is likely to be human written. Human edited text should contain things like spelling mistakes/spelling fixes, moving text around, inserting inline sentences, etc.

Although the edit history could hypothetically be computer generated, the timestamping cannot. This means that written text cannot be created any faster than a human could. Additionally there are no services at the present which can create human-like edit history, and training data to create edit history could be difficult to collect.

The protocol implemented in this repo is designed to be stateless on the remote server - user data, including edit history does not need to be stored or retained for any part of the validation process.

# Build Instructions

This project uses the Quill text editor for text editing and pki.js for cryptographic functionality.

```
npm install
npm run build
```

The output of the above build process is stored in `dist/bundle.js`. To view the demo, you should then open `dist/index.html` in a browser with CORS security features disabled.