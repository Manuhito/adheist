import React, { useState } from 'react';
import { AlertNotification } from '../../components/ui/alert-notification';
import { Button } from '../../shadcn/components/ui/button';
import { Card } from '../../shadcn/components/ui/card';

// Componente personalizado para mensajes de alerta con color personalizado
const ColoredAlertMessage = ({ message, color }) => {
  return <span className={`text-${color}-500`}>{message}</span>;
};

const ProfileForm = ({ userData, formData, currentTz, now }) => {
  // Inicializar el estado del formulario con los valores del usuario
  const initialState = {
    email: userData.email || '',
    first_name: userData.first_name || '',
    last_name: userData.last_name || '',
    timezone: userData.timezone || '',
  };
  
  // Solo incluir el campo language si está disponible en el formulario
  if (formData.fields?.language?.choices) {
    initialState.language = userData.language || '';
  }
  
  const [formState, setFormState] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ show: false, message: '', variant: 'info' });
  const [message, setMessage] = useState(null);
  const [previewImage, setPreviewImage] = useState(userData.avatar_url);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    // Preparar los datos a enviar, excluyendo campos no disponibles
    const dataToSubmit = { ...formState };
    
    // Solo incluir el campo language si está disponible en el formulario
    if (!formData.fields?.language?.choices) {
      delete dataToSubmit.language;
    } else if (!dataToSubmit.language && formData.fields.language.choices.length > 0) {
      // Si el campo está vacío pero hay opciones disponibles, usar la primera opción
      dataToSubmit.language = formData.fields.language.choices[0][0];
    }

    try {
      const response = await fetch('/users/profile/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify(dataToSubmit),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors || 'Failed to update profile');
      }

      const data = await response.json();
      setMessage({ type: 'success', text: data.message || 'Profile successfully saved.' });
      
      // Update language or timezone if needed
      if (formState.language && formState.language !== userData.language) {
        window.location.reload();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Update preview
    updatePreview(file);
    // Upload image
    uploadImage(file);
  };

  const updatePreview = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file) => {
    // Guardamos el contenido original del botón
    const uploadLabel = document.getElementById('profile-upload-label');
    const originalContent = uploadLabel ? uploadLabel.innerHTML : '';
    
    // Indicador visual de carga
    if (uploadLabel) {
      uploadLabel.innerHTML = '<span class="pg-icon"><i class="fa fa-refresh"></i></span><span>Uploading...</span>';
      uploadLabel.classList.add('is-active');
    }

    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('csrfmiddlewaretoken', getCsrfToken());

    try {
      const response = await fetch('/users/profile/upload-image/', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      });

      if (response.ok) {
        const text = await response.text();
        // Mostrar mensaje de éxito como alerta con texto verde
        setAlertInfo({
          show: true,
          message: <ColoredAlertMessage message={text || 'Image uploaded successfully!'} color="emerald" />,
          variant: 'success'
        });
        // Restaurar el botón a su estado original
        if (uploadLabel) {
          uploadLabel.innerHTML = originalContent;
          uploadLabel.classList.remove('is-active', 'pg-text-success', 'pg-text-danger');
        }
      } else {
        const errorResponse = await response.json();
        console.error(errorResponse);
        const errorText = errorResponse.errors;
        // Mostrar mensaje de error como alerta
        setAlertInfo({
          show: true,
          message: errorText,
          variant: 'error'
        });
        // Restaurar el botón a su estado original
        if (uploadLabel) {
          uploadLabel.innerHTML = originalContent;
          uploadLabel.classList.remove('is-active', 'pg-text-success', 'pg-text-danger');
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      // Mostrar mensaje de error como alerta
      setAlertInfo({
        show: true,
        message: 'Error uploading image. Please try again.',
        variant: 'error'
      });
      // Restaurar el botón a su estado original
      if (uploadLabel) {
        uploadLabel.innerHTML = originalContent;
        uploadLabel.classList.remove('is-active', 'pg-text-success', 'pg-text-danger');
      }
    }
  };

  const getCsrfToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];
  };

  return (
    <>
      {alertInfo.show && (
        <AlertNotification
          message={alertInfo.message}
          variant={alertInfo.variant}
          duration={5000}
          onClose={() => setAlertInfo({ ...alertInfo, show: false })}
        />
      )}
      <div className="pg-columns">
      <div id="profile-picture" className="pg-column-one-quarter">
        <div className="flex flex-col items-center justify-center space-y-4 w-full">
          <img className="avatar mx-auto" src={previewImage} alt="Profile" />
          <div id="profile-upload-holder" className="flex justify-center w-full">
            <label htmlFor="profile-upload" className="cursor-pointer inline-block">
              <a 
                id="profile-upload-label" 
                className="pg-button-light hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center gap-1 px-3 py-2 rounded-md border hover:border-gray-400 shadow-sm hover:shadow"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Change Picture
              </a>
            </label>
            <input 
              id="profile-upload" 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>
      <div className="pg-column">
        <h2 className="pg-subtitle">My Details</h2>
        {message && (
          <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'} mb-4`}>
            {message.text}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={formState.email}
              onChange={handleInputChange}
              required
            />
            {userData.emailaddress_set?.count > 1 && (
              <div className="pg-help">
                <a href="/accounts/email/" className="link">Manage email addresses</a>
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" htmlFor="first_name">First Name</label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={formState.first_name}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" htmlFor="last_name">Last Name</label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={formState.last_name}
              onChange={handleInputChange}
            />
          </div>
          
          {formData.fields?.language?.choices && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1" htmlFor="language">Language</label>
              <select
                id="language"
                name="language"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={formState.language}
                onChange={handleInputChange}
              >
                {formData.fields.language.choices.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" htmlFor="timezone">Time Zone</label>
            <select
              id="timezone"
              name="timezone"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={formState.timezone}
              onChange={handleInputChange}
            >
              {formData.fields.timezone.choices.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <div className="pg-help text-sm mt-1">
              {userData.timezone ? (
                <>Your current timezone is {userData.timezone}, where it is {now}.</>
              ) : (
                <>You have not set a timezone, and are using the system timezone of {currentTz} where it is {now}.</>
              )}
            </div>
          </div>
          
          <div className="mt-4">
            <Button 
              type="submit" 
              className="pg-button-primary" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
};

export default ProfileForm;
