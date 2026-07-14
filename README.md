# EliabeArt Interface

A modern, optimized image gallery interface built to study and implement the best practices for sharing image files with optimal performance and user experience.

## 🎯 Project Purpose

This project was created as a study platform to explore and implement the most effective ways to share image files with optimal loading performance. It serves as my personal gallery interface for sharing curated collections of images with enhanced user experience through modern web technologies.

## ✨ Key Features

### Image Optimization & Performance
- **Advanced Image Loading**: Utilizes Next.js Image component for automatic optimization
- **BlurHash Integration**: Implements blurhash-base64 for beautiful placeholder images during loading
- **Sharp Processing**: Server-side image processing for optimal formats and sizes
- **Progressive Loading**: Smooth image transitions with blur-to-sharp effects

### Modern Tech Stack
- **Next.js 14**: React framework with App Router for optimal performance
- **TypeScript**: Type-safe development experience
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Axios**: Efficient HTTP client for API communication

### User Experience
- **Responsive Design**: Optimized for all device sizes
- **Album Organization**: Structured gallery organization by albums
- **Modal Viewing**: Full-screen image viewing experience
- **Smooth Scrolling**: Custom scrollable containers with styled scrollbars

## 🔐 Authentication Model

This interface is designed for **personal use** and does not include frontend user authentication. Access control is managed through:
- **Private Auth Flow**: Backend authentication handling
- **Direct Access**: Intended for personal gallery sharing
- **No User Registration**: Simplified access model

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository
```bash
git clone https://github.com/eliabevces/eliabeart-interface.git
cd eliabeart-interface
```

2. Install dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Configure your API endpoints and other environment variables
```

4. Run the development server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) to view the application

## 📁 Project Structure

```
eliabeart-interface/
├── app/
│   ├── album/[album_id]/     # Dynamic album pages
│   ├── components/           # Reusable UI components
│   ├── lib/                  # API utilities and helpers
│   ├── types/                # TypeScript type definitions
│   └── random/               # Random image feature
├── public/                   # Static assets
└── Configuration files
```

## 🛠 Technologies Used

- **[Next.js 14](https://nextjs.org)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org)** - Type-safe JavaScript
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[BlurHash](https://blurha.sh)** - Image placeholder generation
- **[Sharp](https://sharp.pixelplumbing.com)** - High-performance image processing
- **[Axios](https://axios-http.com)** - Promise-based HTTP client
- **[React](https://reactjs.org)** - UI library

## 📸 Image Optimization Features

### BlurHash Implementation
- Generates beautiful, compact representations of images
- Provides instant visual feedback while images load
- Improves perceived performance and user experience

### Next.js Image Optimization
- Automatic format selection (WebP, AVIF when supported)
- Responsive image sizing
- Lazy loading by default
- Automatic blur placeholder generation

### Performance Benefits
- Reduced initial page load times
- Smooth loading transitions
- Optimized bandwidth usage
- Better Core Web Vitals scores

## 🎨 UI/UX Features

- **Photo Modal**: Full-screen image viewing with navigation
- **Album Grid**: Responsive grid layout for album browsing
- **Smooth Animations**: CSS transitions for enhanced interaction
- **Custom Scrollbars**: Styled scrollable containers
- **Mobile Responsive**: Optimized for mobile and tablet viewing

## 📝 Development

### Build for Production
```bash
npm run build
npm run start
```

### Linting
```bash
npm run lint
```

## 🚀 Deployment

This application can be deployed on various platforms:

- **Vercel** (Recommended): Optimized for Next.js applications
- **Netlify**: Static site deployment
- **Custom Server**: Using `npm run build` and `npm run start`

## 🖼 Image Delivery Pipeline

- Originais JPEG ficam no MinIO em `{album}/{imagem}.jpg`; metadados em JSONs no bucket (`_albums.json`, `{album}/images.json`).
- No ingest (upload pelo admin ou sync `POST /api/albums`), o servidor gera renditions WebP em **480/1080/2048px**, gravadas em `{album}/_thumbs/{imagem}.{w}.webp` (sem upscale — larguras maiores que o original são puladas).
- A rota `GET /api/images/{album_id}/{imagem}?w=480|1080|2048` serve a rendition via streaming, com fallback para o JPEG original se a rendition ainda não existir. Sem `?w=`, serve o original.
- O `POST /api/albums` (admin) também faz **backfill** das renditions faltantes em álbuns antigos — barato quando não há nada a gerar (uma listagem S3 por álbum).
- O frontend usa um `loader` custom no `next/image` que mapeia a largura pedida para a rendition mais próxima, então o otimizador `/_next/image` fica fora do caminho crítico.

### Cache na Cloudflare

As respostas de imagem saem com `Cache-Control: public, max-age=31536000, immutable` e `ETag`. Para garantir cache de edge consistente, crie uma **Cache Rule** no dashboard da Cloudflare:

- **When**: URI Path starts with `/api/images/`
- **Then**: Eligible for cache, com *Origin Cache Control: on* (respeita os headers da origem)

O parâmetro `?code=` dos álbuns privados faz parte da cache key, então imagens privadas continuam exigindo o código correto. A rota `/api/download` envia `Cache-Control: no-cache` e não deve ser cacheada.

## 📄 License

This project is for personal use and educational purposes.

---

*Built with ❤️ for optimal image sharing and performance studies*
