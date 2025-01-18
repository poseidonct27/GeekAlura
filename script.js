document.addEventListener('DOMContentLoaded', () => {
  const apiUrl = "https://678abe40dd587da7ac2b473b.mockapi.io/produtos";

  function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.innerText = message;
    notification.style.display = 'block';

    setTimeout(() => {
      notification.style.display = 'none';
    }, 2000);
  }

  async function fetchApi() {
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao buscar produtos');
      return [];
    }
  }

  function createProductCards(products) {
    const productList = document.getElementById('container-products');
    productList.innerHTML = '';

    products.forEach(product => {
      const productCard = document.createElement('article');
      productCard.classList.add('product-card');

      function formatPriceToPEN(price) {
        return price.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });
      }

      productCard.innerHTML = `
        <img class="product-photo" src="${product.image}" alt="${product.name}">
        <h2>${product.name}</h2>
        <div class="product-value">
          <span>${formatPriceToPEN(product.price)}</span>
          <div class="product-buttons">
            <button type="button" class="edit-button" data-id="${product.id}">
              <img src="assets/edit.png" alt="Editar produto">
            </button>
            <button type="button" class="delete-button" data-id="${product.id}">
              <img src="assets/trash.png" alt="Excluir produto">
            </button>
          </div>
        </div>
      `;

      productList.appendChild(productCard);
    });

    document.querySelectorAll('.delete-button').forEach(button => {
      button.addEventListener('click', deleteProduct);
    });

    document.querySelectorAll('.edit-button').forEach(button => {
      button.addEventListener('click', editProduct);
    });
  }

  async function resizeAndUploadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = function (event) {
        img.src = event.target.result;

        img.onload = async function () {
          const canvas = document.createElement('canvas');
          canvas.width = 176;
          canvas.height = 174;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, 176, 174);

          canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('image', blob, file.name);

            const response = await fetch('https://api.imgbb.com/1/upload?key=e194ff868b90fe6aafb30d6984e79cb5', {
              method: 'POST',
              body: formData
            });

            const result = await response.json();
            resolve(result.data.url);
          }, 'image/jpeg', 0.7);
        };
      };

      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  async function getProducts() {
    const productList = document.getElementById('container-products');
    productList.innerHTML = '<h2>Cargando productos...</h2>';

    const products = await fetchApi();

    if (products.length === 0) {
      productList.innerHTML = '<h2>No hay productos registrados en este momento.</h2>';
    } else {
      createProductCards(products);
    }
  }

  async function addProduct(event) {
    event.preventDefault();
  
    const name = document.getElementById('product-name').value.trim();
    const priceInput = document.getElementById('product-price').value.replace(',', '.');
    const price = parseFloat(priceInput);
    const imageUrl = document.getElementById('product-image-url').value.trim();
    const imageFile = document.getElementById('product-image-file').files[0];

    if (!name || !price || (!imageUrl && !imageFile)) {
      showNotification('¡Por favor rellene todos los campos correctamente!');
      return;
    }
  
    if (name.length < 3) {
      showNotification('El nombre debe tener al menos 3 caracteres.');
      return;
    }
  
    const urlPattern = /^(https?:\/\/)?([\w\d-]+\.)+[\w\d-]+(\/[\w\d- .\/?%&=]*)?$/;
    if (imageUrl && !urlPattern.test(imageUrl)) {
      showNotification('La URL de la imagen no es válida.');
      return;
    }
  
    let image = '';
  
    if (imageUrl) {
      image = imageUrl;
    } else if (imageFile) {
      image = await resizeAndUploadImage(imageFile);
    } else {
      showNotification('¡Por favor proporcione una imagen a través de URL o cárguela!');
      return;
    }
  
    const form = document.getElementById('register-form');
    const editingId = form.dataset.editingId;
  
    if (editingId) {
      console.log(`Editando produto com ID: ${editingId}`);
      try {
        const updatedProduct = { name, price, image };
  
        const response = await fetch(`${apiUrl}/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedProduct)
        });
  
        if (response.ok) {
          showNotification('¡Producto actualizado exitosamente!');
          form.reset();
          delete form.dataset.editingId;
          getProducts();
        } else {
          showNotification('¡Error al actualizar el producto!');
        }
      } catch (error) {
        console.error('Error al actualizar el producto:', error);
      }
    } else {
      try {
        const response = await fetch(apiUrl);
        const existingProducts = await response.json();
  
        const id = (existingProducts.length ? Math.max(...existingProducts.map(p => parseInt(p.id))) + 1 : 1).toString();
  
        const newProduct = {
          id,
          name,
          price,
          image
        };
  
        const postResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProduct)
        });
  
        if (postResponse.ok) {
          const data = await postResponse.json();
  
          form.reset();
          showNotification('¡Producto añadido exitosamente!');
          createProductCards([...existingProducts, data]);
        } else {
          showNotification('¡Error al añadir producto!');
        }
      } catch (error) {
        console.error('Error al agregar producto:', error);
      }
    }
  }
  
  async function deleteProduct(event) {
    const productId = event.target.closest('button').getAttribute('data-id');

    const modalMessage = document.getElementById('modal-delete');
    const confirmButton = document.getElementById('confirm-delete');
    const cancelButton = document.getElementById('cancel-delete');

    modalMessage.style.display = 'flex';

    confirmButton.onclick = async () => {
      try {
        const response = await fetch(`${apiUrl}/${productId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          showNotification('¡Producto eliminado exitosamente!');
          const products = await fetchApi();
          createProductCards(products);
        } else {
          showNotification('¡Error al eliminar el producto!');
        }
      } catch (error) {
        console.error('Error al eliminar el producto:', error);
      } finally {
        modalMessage.style.display = 'none';
      }
    };

    cancelButton.onclick = () => {
      modalMessage.style.display = 'none';
    };

    window.onclick = (event) => {
      if (event.target === modalMessage) {
        modalMessage.style.display = 'none';
      }
    };
  }

  function editProduct(event) {
    const productId = event.target.closest('button').getAttribute('data-id');
    
    fetch(`${apiUrl}/${productId}`)
      .then(response => response.json())
      .then(product => {
        document.getElementById('edit-product-name').value = product.name;
        document.getElementById('edit-product-price').value = product.price;
        document.getElementById('edit-product-image-url').value = product.image;
        document.getElementById('edit-product-image-file').value = '';
        
        const editForm = document.getElementById('edit-form');
        editForm.dataset.editingId = productId;
  
        document.getElementById('modal-edit').style.display = 'block';
      })
      .catch(error => console.error('Error al buscar producto para editar:', error));
  }
  
  document.getElementById('modal-close').onclick = function() {
    document.getElementById('modal-edit').style.display = 'none';
  };
  
  window.onclick = function(event) {
    if (event.target == document.getElementById('modal-edit')) {
      document.getElementById('modal-edit').style.display = 'none';
    }
  };
  
  document.getElementById('edit-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const name = document.getElementById('edit-product-name').value;
    const priceInput = document.getElementById('edit-product-price').value.replace(',', '.');
    const price = parseFloat(priceInput);
    const imageUrl = document.getElementById('edit-product-image-url').value;
    const imageFile = document.getElementById('edit-product-image-file').files[0];

    if (!name || !price || (!imageUrl && !imageFile)) {
      showNotification('¡Por favor, rellene todos los campos!');
      return;
    }
  
    let image = '';
  
    if (imageUrl) {
      image = imageUrl;
    } else if (imageFile) {
      image = await resizeAndUploadImage(imageFile);
    }
  
    const editingId = event.target.dataset.editingId;
    
    try {
      const updatedProduct = { name, price, image };
      
      const response = await fetch(`${apiUrl}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct)
      });
  
      if (response.ok) {
        showNotification('¡Producto actualizado exitosamente!');
        event.target.reset();
        delete event.target.dataset.editingId;
        getProducts();
        document.getElementById('modal-edit').style.display = 'none';
      } else {
        showNotification('¡Error al actualizar el producto!');
      }
    } catch (error) {
      console.error('Error al actualizar el producto:', error);
    }
  });

  function toggleImageInputs() {
    const imageUrlInput = document.getElementById('product-image-url');
    const imageFileInput = document.getElementById('product-image-file');

    imageUrlInput.addEventListener('input', () => {
      if (imageUrlInput.value) {
        imageFileInput.value = '';
        imageFileInput.disabled = true;
      } else {
        imageFileInput.disabled = false; 
      }
    });

    imageFileInput.addEventListener('change', () => {
      if (imageFileInput.files.length > 0) {
        imageUrlInput.value = '';
        imageUrlInput.disabled = true; 
      } else {
        imageUrlInput.disabled = false; 
      }
    });

    document.getElementById('register-form').addEventListener('reset', () => {
      imageUrlInput.disabled = false;
      imageFileInput.disabled = false;
    });
  }

  function toggleEditImageInputs() {
    const editImageUrlInput = document.getElementById('edit-product-image-url');
    const editImageFileInput = document.getElementById('edit-product-image-file');

    editImageUrlInput.addEventListener('input', () => {
      if (editImageUrlInput.value) {
        editImageFileInput.value = '';
        editImageFileInput.disabled = true;
      } else {
        editImageFileInput.disabled = false; 
      }
    });

    editImageFileInput.addEventListener('change', () => {
      if (editImageFileInput.files.length > 0) {
        editImageUrlInput.value = '';
        editImageUrlInput.disabled = true; 
      } else {
        editImageUrlInput.disabled = false;
      }
    });

    document.getElementById('edit-form').addEventListener('reset', () => {
      editImageUrlInput.disabled = false;
      editImageFileInput.disabled = false;
    });
  }

  toggleImageInputs();
  toggleEditImageInputs();

  const form = document.getElementById('register-form');
  form.addEventListener('submit', addProduct);

  getProducts();
});