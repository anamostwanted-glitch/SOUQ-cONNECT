import { collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { z } from 'zod';

export const CampaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(256),
  status: z.enum(['draft', 'active', 'paused', 'completed']),
  platform: z.enum(['meta', 'google']),
  budget: z.number().min(0),
  spent: z.number().min(0).default(0),
  conversions: z.number().min(0).default(0),
  clicks: z.number().min(0).default(0),
  createdAt: z.string().datetime(),
});

export type Campaign = z.infer<typeof CampaignSchema> & { id: string };

export const createCampaign = async (data: Omit<Campaign, 'id'>) => {
  const validatedData = CampaignSchema.parse(data);
  return await addDoc(collection(db, 'campaigns'), validatedData);
};

export const subscribeToCampaigns = (callback: (campaigns: Campaign[]) => void) => {
  const q = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
    callback(data);
  });
};
