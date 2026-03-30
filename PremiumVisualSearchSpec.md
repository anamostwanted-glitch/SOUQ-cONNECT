# Premium Visual Search - Product UX Specification

## 1. Vision & Overview
The **Premium Visual Search** is a high-end, AI-powered feature designed to bridge the gap between physical inspiration and B2B procurement. It allows users to instantly identify products from images and connect with relevant suppliers, transforming a simple photo into a structured procurement workflow.

## 2. Placement & Navigation Strategy
- **Desktop Header**: A prominent, stylized button in the main navigation bar with a "Premium" badge and a unique icon (e.g., a camera with a sparkle).
- **Mobile Navigation**: A dedicated "Quick Action" button in the center of the bottom navigation bar or a clearly visible entry point in the header.
- **Onboarding**: A subtle tooltip or pulse animation for first-time users to highlight the feature.

## 3. User Journey (The "Visual-to-Vendor" Flow)
1. **Discovery**: User sees the "Premium Visual Search" CTA in the header.
2. **Input**: User clicks and is presented with a sleek modal offering "Upload Image" or "Take Photo" (mobile).
3. **Preview & Refine**: User sees the image, can crop or rotate it to focus on the specific product.
4. **AI Analysis (Scanning)**: An elegant "Scanning" animation overlays the image while Gemini AI analyzes the content.
5. **Smart Results**:
   - **Product Attributes**: Type, Color, Material, Style, Category.
   - **Confidence Score**: A percentage indicating the AI's certainty.
   - **Suggested Tags**: Interactive tags to refine the search.
6. **Supplier Matching**: AI matches the extracted attributes with the supplier database.
7. **Action**: User can "Send RFQ to All Matches", "Compare Suppliers", or "Save to Favorites".

## 4. Information Architecture
- **Modal Container**: Backdrop blur, centered, responsive.
- **Upload Zone**: Drag-and-drop support, camera trigger.
- **Analysis View**: Image preview (left/top), AI results (right/bottom).
- **Supplier Grid**: Cards showing supplier logo, name, rating, and match percentage.

## 5. AI Integration Logic
- **Image Analysis**: Uses `gemini-3.1-flash-image-preview` for high-accuracy visual recognition.
- **Attribute Extraction**: Structured JSON output containing `productType`, `color`, `material`, `style`, `category`, `keywords`.
- **Supplier Ranking**: Semantic matching between extracted keywords and supplier profiles.
- **Smart RFQ Generation**: Automatically drafts a professional inquiry based on the visual analysis.

## 6. Micro-Interactions & Feedback
- **Scanning Effect**: A horizontal glowing line moving up and down the image during analysis.
- **Haptic Feedback**: Subtle vibrations on mobile during successful capture or match.
- **Skeleton States**: Premium shimmer effects while suppliers are being matched.
- **Success Confirmation**: A celebratory but professional checkmark animation after sending a request.

## 7. Responsive Design
- **Desktop**: Side-by-side layout for image and results.
- **Mobile**: Vertical stack, optimized for thumb reach, full-screen modal experience.

## 8. Accessibility & Brand Consistency
- **Contrast**: High contrast for text overlays.
- **Aria Labels**: Comprehensive labels for screen readers.
- **Branding**: Uses the brand's primary teal/primary gradients and signature rounded corners (2.5rem).
