import React, { useState, useEffect } from 'react';
import { Campaign, subscribeToCampaigns, createCampaign } from '@/core/services/campaignService';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { toast } from 'sonner';
import { z } from 'zod';

import { handleFirestoreError, OperationType } from '@/core/utils/errorHandling';

export const CampaignManager: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCampaign, setNewCampaign] = useState<{ name: string; platform: 'meta' | 'google'; budget: number }>({ name: '', platform: 'meta', budget: 0 });

  useEffect(() => {
    const unsubscribe = subscribeToCampaigns(setCampaigns);
    return unsubscribe;
  }, []);

  const handleCreateCampaign = async () => {
    setLoading(true);
    try {
      await createCampaign({
        ...newCampaign,
        status: 'draft',
        spent: 0,
        conversions: 0,
        clicks: 0,
        createdAt: new Date().toISOString()
      });
      toast.success('Campaign created successfully');
      setNewCampaign({ name: '', platform: 'meta', budget: 0 });
    } catch (e) {
      if (e instanceof z.ZodError) {
        toast.error(`Validation error: ${(e as z.ZodError).issues[0].message}`);
      } else {
        toast.error('Failed to create campaign');
        handleFirestoreError(e, OperationType.CREATE, 'campaigns', false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Campaign</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <input 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Campaign Name" 
            value={newCampaign.name} 
            onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} 
          />
          <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={newCampaign.platform} 
            onChange={e => setNewCampaign({...newCampaign, platform: e.target.value as 'meta' | 'google'})}
          >
            <option value="meta">Meta</option>
            <option value="google">Google</option>
          </select>
          <input 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            type="number" 
            placeholder="Budget" 
            value={newCampaign.budget} 
            onChange={e => setNewCampaign({...newCampaign, budget: Number(e.target.value)})} 
          />
          <Button onClick={handleCreateCampaign} disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map(c => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle>{c.name} ({c.platform.toUpperCase()})</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Status: {c.status}</p>
              <p>Budget: ${c.budget}</p>
              <p>Spent: ${c.spent}</p>
              <p>Conversions: {c.conversions}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
