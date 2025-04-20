# 📊 CSV to Strapi Uploader

<div align="center">

A modern, elegant tool to seamlessly upload CSV data to your Strapi CMS instance.

[![Next.js](https://img.shields.io/badge/Next.js-13.4+-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Strapi](https://img.shields.io/badge/Strapi-4.x-8e75ff?style=for-the-badge&logo=strapi&logoColor=white)](https://strapi.io/)

</div>

## ✨ Features

- 🔄 **Automatic Content Type Detection** - Automatically detects and maps Strapi content types
- 🗃️ **Flexible CSV Parsing** - Support for various CSV formats with custom separators
- 🔍 **Smart Field Mapping** - Intuitive interface to map CSV columns to Strapi fields
- 🛡️ **Data Validation** - Validates data before upload to prevent errors
- ⚙️ **Advanced Configuration** - Fine-tune upload settings for your specific needs
- 📱 **Responsive Design** - Works beautifully on desktop and mobile devices
- 🚀 **Batch Processing** - Upload data in batches with configurable delay

## 🚀 Getting Started

### Prerequisites

- Node.js 16.x or later
- A running Strapi instance (v4.x)
- CORS properly configured on your Strapi instance

### Installation

1. Clone the repository:

\`\`\`bash
git clone https://github.com/yourusername/csv-to-strapi-uploader.git
cd csv-to-strapi-uploader
\`\`\`

2. Install dependencies:

\`\`\`bash
npm install
# or
yarn install
# or
pnpm install
\`\`\`

3. Run the development server:

\`\`\`bash
npm run dev
# or
yarn dev
# or
pnpm dev
\`\`\`

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 📖 Usage Guide

### 1. Connect to Strapi

Enter your Strapi URL and API token to connect to your Strapi instance. The application will attempt to discover available content types.

- **Strapi URL**: The base URL of your Strapi instance (e.g., `https://your-strapi-instance.com`)
- **API Token**: A valid Strapi API token with read/write permissions
- **Known API Endpoint** (optional): If you know a specific API endpoint that works, you can enter it here to help with content type discovery

### 2. Configure Import

Select the content type you want to import data into and configure your CSV settings:

- **Content Type**: Choose the Strapi content type to import data into
- **Column Separator**: Select the separator used in your CSV file (comma, semicolon, pipe, or tab)
- **CSV has header row**: Enable if your CSV file includes a header row with column names

Then upload your CSV file by dragging and dropping or using the file browser.

### 3. Map Fields

Map your CSV columns to Strapi fields:

- Required fields are marked with a "Required" badge
- Field types are displayed to help with mapping
- You can leave fields unmapped if you don't want to import that data

### 4. Advanced Settings

Expand the "Advanced Upload Settings" section to configure:

- **Empty Value Handling**:
  - Convert empty numbers to zero
  - Convert empty values to null
  - Skip empty values entirely

- **Upload Settings**:
  - Batch Size: Number of items to upload in a single request
  - Delay Between Requests: Time to wait between batches (in milliseconds)

### 5. Upload

Click "Upload to Strapi" to start the import process. You can:

- Monitor progress in real-time
- Pause and resume the upload
- View validation errors and failed rows
- Retry failed uploads

## ⚙️ Configuration Options

### Environment Variables

You can customize the application by setting the following environment variables:

\`\`\`env
# .env.local
NEXT_PUBLIC_DEFAULT_STRAPI_URL=https://your-default-strapi.com
NEXT_PUBLIC_MAX_BATCH_SIZE=20
NEXT_PUBLIC_DEFAULT_DELAY=300
\`\`\`

### Tailwind Configuration

The application uses Tailwind CSS for styling. You can customize the theme by editing the `tailwind.config.ts` file.

## 🔧 Troubleshooting

### CORS Issues

If you encounter CORS errors when connecting to Strapi, ensure your Strapi instance is configured to allow requests from the domain where this application is hosted.

In your Strapi configuration (`config/middleware.js`):

\`\`\`javascript
module.exports = {
  settings: {
    cors: {
      enabled: true,
      origin: ['http://localhost:3000', 'https://your-app-domain.com'],
    },
  },
};
\`\`\`

### Content Type Discovery

If the application cannot discover your content types:

1. Ensure your API token has sufficient permissions
2. Try providing a known API endpoint in the connection form
3. Check that your content types are publicly accessible or that your token has access to them

### Upload Errors

If you encounter errors during upload:

1. Check the validation errors and failed rows section for specific error messages
2. Ensure your CSV data matches the expected format for each field
3. Try reducing the batch size and increasing the delay between requests
4. Verify that your API token has write permissions for the selected content type

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Lucide Icons](https://lucide.dev/)
- [Strapi](https://strapi.io/)

---

<div align="center">
  Made with ❤️
</div>
