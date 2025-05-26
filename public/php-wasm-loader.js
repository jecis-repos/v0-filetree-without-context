// This script loads PHP-WASM from CDN
;(() => {
  // Create a script element
  const script = document.createElement("script")
  script.type = "module"

  // Set the source to the PHP-WASM CDN
  script.innerHTML = `
    import { PhpWeb } from 'https://cdn.jsdelivr.net/npm/php-wasm@0.0.9-alpha/PhpWeb.mjs';
    window.PhpWeb = PhpWeb;
  `

  // Add the script to the document head
  document.head.appendChild(script)

  console.log("PHP-WASM loader script added to document head")
})()
