/**
 * Optimized Personalizer JavaScript - Extracted from Liquid template
 * This reduces the main template size and enables better caching
 */
class PersonalizerManager {
  constructor(blockId) {
    this.blockId = blockId;
    this.form = document.querySelector(`[data-block-id="${blockId}"] .personalizer-form`);
    this.canvas = document.getElementById(`canvas-${blockId}`);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.previewText = document.getElementById(`preview-text-${blockId}`);
    this.previewLogo = document.getElementById(`preview-logo-${blockId}`);
    this.logoDisplay = document.getElementById(`logo-display-${blockId}`);
    this.hiddenInput = document.getElementById(`personalization-data-${blockId}`);
    this.downloadBtn = document.getElementById(`download-btn-${blockId}`);

    this.customizationData = {
      name: '',
      textFields: {},
      fontFamily: 'Arial',
      fontSize: 18,
      fontBold: false,
      fontItalic: false,
      fontUnderline: false,
      textColor: '#000000',
      backgroundColor: '#ffffff',
      textAlign: 'center',
      verticalAlign: 'middle',
      customLogo: null,
      backgroundImage: null,
      logoSize: 100,
      textXPosition: 500,
      textYPosition: 500,
      logoXPosition: 500,
      logoYPosition: 800
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.updatePreview();
    this.updateRangeValue();
  }

  bindEvents() {
    // Debounced input events for better performance
    this.form.addEventListener('input', this.debounce(this.updatePreview.bind(this), 100));
    this.form.addEventListener('change', this.updatePreview.bind(this));

    // Font size range input
    const fontSizeInput = this.form.querySelector('input[name="font_size"]');
    if (fontSizeInput) {
      fontSizeInput.addEventListener('input', this.updateRangeValue.bind(this));
    }

    // File upload handlers
    this.bindFileUploads();
    this.bindRemoveButtons();
    this.bindPositionControls();
    this.bindDownloadButton();
    this.bindAddToCartIntegration();
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  updatePreview() {
    if (!this.previewText) return;

    // Get form values efficiently
    const formData = new FormData(this.form);
    const nameInput = this.form.querySelector('input[data-field-type="name"]');
    const nameText = nameInput ? nameInput.value.trim() : '';

    // Collect additional text field values
    const textInputs = this.form.querySelectorAll('input[data-field-type="text"]');
    let additionalText = '';
    textInputs.forEach(input => {
      if (input.value.trim()) {
        additionalText += input.value.trim() + ' ';
      }
    });

    // Update preview text
    let displayText = nameText || additionalText.trim() || 'Your customization will appear here';
    this.previewText.textContent = displayText;

    // Apply styles efficiently
    this.applyTextStyles(formData);
    this.updateCanvasBackground();
    this.updateLogoDisplay();
    this.updateCharacterCount();
    this.updateCustomizationData(displayText);
  }

  applyTextStyles(formData) {
    const fontFamily = formData.get('font_family') || 'Arial';
    const fontSize = formData.get('font_size') || 18;
    const textColor = formData.get('text_color') || '#000000';
    const fontBold = formData.get('font_bold') === 'bold';
    const fontItalic = formData.get('font_italic') === 'italic';
    const fontUnderline = formData.get('font_underline') === 'underline';

    // Apply styles to preview text
    Object.assign(this.previewText.style, {
      fontFamily,
      fontSize: fontSize + 'px',
      color: textColor,
      fontWeight: fontBold ? 'bold' : 'normal',
      fontStyle: fontItalic ? 'italic' : 'normal',
      textDecoration: fontUnderline ? 'underline' : 'none'
    });

    // Update positioning
    const textX = formData.get('text_x_position') || 500;
    const textY = formData.get('text_y_position') || 500;
    
    Object.assign(this.previewText.style, {
      position: 'absolute',
      left: (textX / 1000 * 100) + '%',
      top: (textY / 1000 * 100) + '%',
      transform: 'translate(-50%, -50%)',
      zIndex: '10'
    });

    this.customizationData.textXPosition = parseInt(textX);
    this.customizationData.textYPosition = parseInt(textY);
  }

  updateCanvasBackground() {
    if (!this.canvas || !this.ctx) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw product image as background
    const productImg = document.getElementById(`product-bg-img-${this.blockId}`);
    if (productImg && productImg.complete) {
      this.ctx.drawImage(productImg, 0, 0, this.canvas.width, this.canvas.height);
    }
    
    // Draw custom background if available
    if (this.customizationData.backgroundImage) {
      const img = new Image();
      img.onload = () => {
        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      };
      img.src = this.customizationData.backgroundImage;
    }
  }

  updateLogoDisplay() {
    if (!this.logoDisplay || !this.customizationData.customLogo) {
      if (this.previewLogo) this.previewLogo.style.display = 'none';
      return;
    }

    this.logoDisplay.src = this.customizationData.customLogo;
    const logoSize = this.form.querySelector('input[name="logo_size"]')?.value || 100;
    this.logoDisplay.style.maxWidth = logoSize + 'px';
    this.logoDisplay.style.maxHeight = logoSize + 'px';
    
    // Update logo positioning
    const logoX = this.form.querySelector('input[name="logo_x_position"]')?.value || 500;
    const logoY = this.form.querySelector('input[name="logo_y_position"]')?.value || 800;
    
    if (this.previewLogo) {
      Object.assign(this.previewLogo.style, {
        display: 'block',
        position: 'absolute',
        left: (logoX / 1000 * 100) + '%',
        top: (logoY / 1000 * 100) + '%',
        transform: 'translate(-50%, -50%)',
        zIndex: '10'
      });
    }
    
    this.customizationData.logoXPosition = parseInt(logoX);
    this.customizationData.logoYPosition = parseInt(logoY);
  }

  updateCharacterCount() {
    const nameInput = this.form.querySelector('input[data-field-type="name"]');
    const currentCount = this.form.querySelector('.current-count');
    if (nameInput && currentCount) {
      currentCount.textContent = nameInput.value.length;
    }
  }

  updateCustomizationData(displayText) {
    const formData = new FormData(this.form);
    
    this.customizationData = {
      ...this.customizationData,
      name: formData.get('custom_name') || '',
      fontFamily: formData.get('font_family') || 'Arial',
      fontSize: parseInt(formData.get('font_size')) || 18,
      fontBold: formData.get('font_bold') === 'bold',
      fontItalic: formData.get('font_italic') === 'italic',
      fontUnderline: formData.get('font_underline') === 'underline',
      textColor: formData.get('text_color') || '#000000',
      backgroundColor: formData.get('background_color') || '#ffffff',
      displayText: displayText,
      logoSize: parseInt(formData.get('logo_size')) || 100
    };

    // Update hidden input
    if (this.hiddenInput) {
      this.hiddenInput.value = JSON.stringify({
        ...this.customizationData,
        timestamp: new Date().toISOString()
      });
    }
  }

  updateRangeValue() {
    const fontSizeInput = this.form.querySelector('input[name="font_size"]');
    const rangeValue = this.form.querySelector('.range-value');
    if (fontSizeInput && rangeValue) {
      rangeValue.textContent = fontSizeInput.value + 'px';
    }
  }

  bindFileUploads() {
    // Logo upload
    const logoUpload = this.form.querySelector('input[name="custom_logo"]');
    if (logoUpload) {
      logoUpload.addEventListener('change', (e) => this.handleFileUpload(e, 'logo'));
    }

    // Background upload
    const backgroundUpload = this.form.querySelector('input[name="background_image"]');
    if (backgroundUpload) {
      backgroundUpload.addEventListener('change', (e) => this.handleFileUpload(e, 'background'));
    }
  }

  handleFileUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === 'logo') {
        this.customizationData.customLogo = e.target.result;
        this.showPreview('logo', e.target.result);
      } else if (type === 'background') {
        this.customizationData.backgroundImage = e.target.result;
        this.showPreview('background', e.target.result);
      }
      this.updatePreview();
    };
    reader.readAsDataURL(file);
  }

  showPreview(type, src) {
    const preview = document.getElementById(`${type}-preview-${this.blockId}`);
    const previewImg = document.getElementById(`${type}-preview-img-${this.blockId}`);
    if (preview && previewImg) {
      previewImg.src = src;
      preview.style.display = 'flex';
    }
  }

  bindRemoveButtons() {
    const removeBtns = this.form.querySelectorAll('.remove-btn');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const removeType = e.target.getAttribute('data-remove');
        if (removeType === 'logo') {
          this.customizationData.customLogo = null;
          this.hidePreview('logo');
          const logoUpload = document.getElementById(`logo-upload-${this.blockId}`);
          if (logoUpload) logoUpload.value = '';
        } else if (removeType === 'background') {
          this.customizationData.backgroundImage = null;
          this.hidePreview('background');
          const backgroundUpload = document.getElementById(`background-upload-${this.blockId}`);
          if (backgroundUpload) backgroundUpload.value = '';
        }
        this.updatePreview();
      });
    });
  }

  hidePreview(type) {
    const preview = document.getElementById(`${type}-preview-${this.blockId}`);
    if (preview) preview.style.display = 'none';
  }

  bindPositionControls() {
    // Text positioning
    ['text_x_position', 'text_y_position', 'logo_x_position', 'logo_y_position', 'logo_size'].forEach(name => {
      const input = this.form.querySelector(`input[name="${name}"]`);
      if (input) {
        input.addEventListener('input', () => {
          const valueDisplay = this.form.querySelector(`.${name.replace('_', '-')}-value`);
          if (valueDisplay) {
            valueDisplay.textContent = input.value + (name.includes('size') ? 'px' : 'px');
          }
          this.updatePreview();
        });
      }
    });
  }

  bindDownloadButton() {
    if (this.downloadBtn && this.canvas) {
      this.downloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'customization-preview.png';
        link.href = this.canvas.toDataURL();
        link.click();
      });
    }
  }

  bindAddToCartIntegration() {
    const addToCartForm = document.querySelector('form[action*="/cart/add"]');
    if (addToCartForm) {
      addToCartForm.addEventListener('submit', () => {
        const personalizationData = this.hiddenInput ? this.hiddenInput.value : '';
        if (personalizationData) {
          const hiddenProperty = document.createElement('input');
          hiddenProperty.type = 'hidden';
          hiddenProperty.name = 'properties[Advanced_Personalization]';
          hiddenProperty.value = personalizationData;
          addToCartForm.appendChild(hiddenProperty);
        }
      });
    }
  }
}

// Initialize personalizer when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Find all personalizer blocks and initialize them
  const personalizerBlocks = document.querySelectorAll('.advanced-personalizer');
  personalizerBlocks.forEach(block => {
    const blockId = block.getAttribute('data-block-id');
    if (blockId) {
      new PersonalizerManager(blockId);
    }
  });
});