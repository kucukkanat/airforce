import './style.css'
import './package-card.ts'

document.body.innerHTML = `
  <h2>From blue registry (default):</h2>
  <package-card package="@ingka/skapa-webc-element"></package-card>
  
  <h2>From npm registry:</h2>
  <package-card package="react" registry="npm"></package-card>
`;