import { marked } from 'marked';

interface PackageInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  readme: string;
}

export class PackageCard extends HTMLElement {
  private info: PackageInfo = {
    name: '',
    version: '',
    description: '',
    author: '',
    readme: ''
  };

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['name', 'version', 'description', 'author', 'readme'];
  }

  attributeChangedCallback(name: string, _: string, newValue: string) {
    if (this.info.hasOwnProperty(name)) {
      this.info[name as keyof PackageInfo] = newValue;
      this.render();
    }
  }

  connectedCallback() {
    this.render();
  }

  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .card {
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          margin: 1rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .package-name {
          color: #2f363d;
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
        }
        .version {
          display: inline-block;
          background: #f1f8ff;
          color: #0366d6;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }
        .description {
          color: #586069;
          line-height: 1.5;
          margin-bottom: 1rem;
        }
        .author {
          color: #6a737d;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }
        .readme {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e1e4e8;
        }
        .readme-toggle {
          background: none;
          border: none;
          color: #0366d6;
          cursor: pointer;
          font-size: 0.875rem;
          padding: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .readme-toggle:hover {
          text-decoration: underline;
        }
        .readme-content {
          display: none;
          margin-top: 1rem;
          padding: 1rem;
          background: #f6f8fa;
          border-radius: 6px;
          font-size: 0.875rem;
          line-height: 1.6;
          overflow-x: auto;
        }
        .readme-content.show {
          display: block;
        }
        /* Markdown styles */
        .readme-content h1 { font-size: 1.5em; margin: 0.5em 0; }
        .readme-content h2 { font-size: 1.3em; margin: 0.5em 0; }
        .readme-content h3 { font-size: 1.1em; margin: 0.5em 0; }
        .readme-content p { margin: 1em 0; }
        .readme-content code {
          background: #e1e4e8;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace;
          font-size: 85%;
        }
        .readme-content pre {
          background: #e1e4e8;
          padding: 1em;
          border-radius: 6px;
          overflow-x: auto;
        }
        .readme-content pre code {
          background: none;
          padding: 0;
        }
        .readme-content ul, .readme-content ol {
          padding-left: 2em;
          margin: 1em 0;
        }
        .readme-content blockquote {
          margin: 1em 0;
          padding-left: 1em;
          border-left: 0.25em solid #dfe2e5;
          color: #6a737d;
        }
      </style>
      <div class="card">
        <h2 class="package-name">${this.info.name}</h2>
        <span class="version">v${this.info.version}</span>
        <p class="description">${this.info.description}</p>
        <div class="author">By ${this.info.author}</div>
        ${this.info.readme ? `
          <div class="readme">
            <button class="readme-toggle" onclick="this.closest('.readme').querySelector('.readme-content').classList.toggle('show')">
              📖 View README
            </button>
            <div class="readme-content">
              ${marked(this.info.readme)}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('package-card', PackageCard);