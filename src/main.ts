import './style.css'
import './package-card.ts'

document.body.innerHTML = `
  <package-card package="@ingka/skapa-webc-element"></package-card>
  <package-card package="react" registry="npm"></package-card>
  <package-card package="subscribe" registry="npm"></package-card>
`;