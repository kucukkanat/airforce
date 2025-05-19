import { marked } from 'marked';
import { fetchPackageMetadata, fetchNpmPackageFiles, type PackageMetadata, type RegistryType } from './pacman';

export class PackageCard extends HTMLElement {
  private metadata: PackageMetadata | null = null;
  private selectedVersion: string = 'latest';
  private readme: string = '';
  private loading: boolean = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['package', 'registry'];
  }

  async attributeChangedCallback(name: string, _: string, newValue: string) {
    if (name === 'package' && newValue) {
      await this.fetchPackageInfo(newValue);
    } else if (name === 'registry' && this.getAttribute('package')) {
      await this.fetchPackageInfo(this.getAttribute('package')!);
    }
  }

  private getRegistryOption(): { registry?: RegistryType } {
    const registry = this.getAttribute('registry');
    return registry && (registry === 'npm' || registry === 'blue') 
      ? { registry } 
      : {};
  }

  private async fetchPackageInfo(packageName: string) {
    this.loading = true;
    this.render();
    
    try {
      this.metadata = await fetchPackageMetadata(packageName, this.getRegistryOption());
      this.selectedVersion = this.metadata['dist-tags'].latest;
      await this.fetchReadme(packageName, this.selectedVersion);
    } catch (error) {
      console.error('Error fetching package info:', error);
      this.renderError();
    } finally {
      this.loading = false;
      this.render();
    }
  }

  private async fetchReadme(packageName: string, version: string) {
    try {
      const files = await fetchNpmPackageFiles(`${packageName}@${version}`, this.getRegistryOption());
      const readmeFile = files.find(file => 
        file.path.toLowerCase() === 'readme.md' || 
        file.path.toLowerCase() === 'readme'
      );
      this.readme = readmeFile?.content || 'No README available for this version.';
    } catch (error) {
      console.error('Error fetching readme:', error);
      this.readme = 'Failed to load README content.';
    }
  }

  private getVersions(): string[] {
    if (!this.metadata) return [];
    return Object.keys(this.metadata.versions).sort((a, b) => {
      return b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  private async handleVersionChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedVersion = select.value;
    this.loading = true;
    this.render();
    
    const packageName = this.getAttribute('package');
    if (packageName) {
      await this.fetchReadme(packageName, this.selectedVersion);
    }
    
    this.loading = false;
    this.render();
  }

  private renderError() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <div class="error">
        Failed to load package information
      </div>
    `;
  }

  private render() {
    if (!this.shadowRoot || !this.metadata) return;

    const versions = this.getVersions();
    const currentVersion = this.metadata.versions[this.selectedVersion];
    const packageInfo = currentVersion || {};

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
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
          gap: 1rem;
        }
        .package-name {
          color: #2f363d;
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .version-select {
          background: #f1f8ff;
          border: 1px solid #c8e1ff;
          border-radius: 6px;
          padding: 0.375rem 2.25rem 0.375rem 0.75rem;
          font-size: 0.875rem;
          color: #0366d6;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%230366d6' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          background-size: 12px;
        }
        .version-select:hover {
          background-color: #e1f0ff;
        }
        .version-select:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .description {
          color: #586069;
          line-height: 1.5;
          margin-bottom: 1rem;
        }
        .readme {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e1e4e8;
        }
        .readme-content {
          font-size: 0.875rem;
          line-height: 1.6;
          overflow-x: auto;
        }
        .loading {
          padding: 2rem;
          text-align: center;
          color: #586069;
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
        .error {
          color: #cb2431;
          padding: 1rem;
          text-align: center;
        }
      </style>
      <div class="card">
        <div class="header">
          <h2 class="package-name">${packageInfo.name || this.getAttribute('package')}</h2>
          <select 
            class="version-select" 
            ?disabled="${this.loading}"
          >
            ${versions.map(v => `
              <option value="${v}" ${v === this.selectedVersion ? 'selected' : ''}>
                ${v}
              </option>
            `).join('')}
          </select>
        </div>
        <p class="description">${packageInfo.description || ''}</p>
        <div class="readme">
          <div class="readme-content">
            ${this.loading 
              ? '<div class="loading">Loading README...</div>' 
              : marked(this.readme)}
          </div>
        </div>
      </div>
    `;

    // Add event listener after rendering
    const versionSelect = this.shadowRoot.querySelector('.version-select');
    if (versionSelect) {
      versionSelect.addEventListener('change', (e) => this.handleVersionChange(e));
    }
  }
}

customElements.define('package-card', PackageCard);