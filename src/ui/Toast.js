/**
 * Toast - Non-intrusive floating status notifications
 */

export class Toast {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(this.container);
  }

  show(message, { type = 'info', duration = 3000 } = {}) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'recording') icon = '🔴';
    if (type === 'export') icon = '💾';

    toast.innerHTML = `
      <span aria-hidden="true">${icon}</span>
      <span>${message}</span>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => {
        if (toast.parentNode === this.container) {
          this.container.removeChild(toast);
        }
      }, 300);
    }, duration);
  }
}

export const toast = new Toast();
