import React, { useState } from 'react';
import { Button } from '../../shadcn/components/ui/button';
import { Card } from '../../shadcn/components/ui/card';

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
    const uploadLabel = document.getElementById('profile-upload-label');
    if (uploadLabel) {
      uploadLabel.innerHTML = '<span class="pg-icon"><i class="fa fa-refresh"></i></span><span>Uploading...</span>';
      uploadLabel.classList.add('is-active');
    }

    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('csrfmiddlewaretoken', getCsrfToken());

    try {
      const response = await fetch('/users/upload_profile_image/', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      });

      if (response.ok) {
        const text = await response.text();
        if (uploadLabel) {
          uploadLabel.innerHTML = '<span class="pg-icon"><i class="fa fa-check"></i></span><span>' + text + '</span>';
          uploadLabel.classList.remove('is-active');
          uploadLabel.classList.add('pg-text-success');
        }
      } else {
        const errorResponse = await response.json();
        console.error(errorResponse);
        const errorText = errorResponse.errors;
        if (uploadLabel) {
          uploadLabel.innerHTML = '<span title="' + errorText + '" ><span class="pg-icon"><i class="fa fa-times"></i></span><span>Upload failed!</span></span>';
          uploadLabel.classList.add('pg-text-danger');
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      if (uploadLabel) {
        uploadLabel.innerHTML = '<span><span class="pg-icon"><i class="fa fa-times"></i></span><span>Upload failed!</span></span>';
        uploadLabel.classList.add('pg-text-danger');
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
    <div className="pg-columns">
      <div id="profile-picture" className="pg-column-one-quarter">
        <div className="pg-text-centered">
          <img className="avatar" src={previewImage} alt="Profile" />
          <div id="profile-upload-holder">
            <label htmlFor="profile-upload">
              <a id="profile-upload-label" className="pg-button-light">
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
  );
};

export default ProfileForm;
