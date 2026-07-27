import type { Dict } from "./en";

// Bahasa Indonesia UI dictionary. Partial by design: missing keys fall back to
// `en` via t(). Deep-partial so nested groups may be filled incrementally.
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export const id: DeepPartial<Dict> = {
  nav: {
    solutions: "Solusi",
    features: "Fitur",
    resources: "Sumber Daya",
    successStories: "Kisah Sukses",
    about: "Tentang",
    pricing: "Harga",
    login: "Masuk",
  },
  cta: {
    requestDemo: "Minta Demo",
    exploreSolutions: "Jelajahi Solusi",
    getStarted: "Mulai",
    learnMore: "Selengkapnya",
    contactSales: "Hubungi Sales",
  },
  footer: {
    product: "Produk",
    company: "Perusahaan",
    resources: "Sumber Daya",
    legal: "Legal",
    rights: "Seluruh hak cipta dilindungi.",
  },
  common: {
    home: "Beranda",
    loading: "Memuat…",
    save: "Simpan",
    cancel: "Batal",
    delete: "Hapus",
    edit: "Ubah",
    close: "Tutup",
    back: "Kembali",
    next: "Berikutnya",
    search: "Cari",
  },
  form: {
    submit: "Kirim",
    required: "Kolom ini wajib diisi.",
  },
};
