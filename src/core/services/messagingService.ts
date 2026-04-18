import axios from 'axios';

/**
 * Core Team: Automated Messaging Service
 * This service communicates with the backend to send automated WhatsApp 
 * and Email notifications to users based on marketplace events.
 */

export const sendAutomatedNotification = async (params: {
  type: 'whatsapp' | 'email';
  recipient: string;
  message?: string;
  template?: 'welcome' | 'new_request' | 'new_offer' | 'new_message' | 'offer_accepted';
  data?: any;
  language?: 'ar' | 'en';
  name?: string;
}) => {
  try {
    const endpoint = params.type === 'whatsapp' ? '/api/send-whatsapp' : '/api/send-email';
    
    // Prepare payload for backend
    const payload = params.type === 'whatsapp' 
      ? { phoneNumber: params.recipient, message: params.message }
      : { 
          email: params.recipient, 
          name: params.name || 'User', 
          template: params.template, 
          data: params.data, 
          language: params.language 
        };

    const response = await axios.post(endpoint, payload);
    return response.data;
  } catch (error) {
    console.error(`Messaging Service Error (${params.type}):`, error);
    return { success: false, error };
  }
};

/**
 * Helper to notify relevant suppliers about a new high-intent request
 */
export const notifySuppliersOfRequest = async (requestData: any, suppliers: any[]) => {
  // Logic to iterate and notify via preferred channel
  suppliers.forEach(supplier => {
    if (supplier.phone) {
      sendAutomatedNotification({
        type: 'whatsapp',
        recipient: supplier.phone,
        message: `Connect AI: New business opportunity! Someone is looking for ${requestData.productName}. View details at ${window.location.origin}/requests`
      });
    }
  });
};
