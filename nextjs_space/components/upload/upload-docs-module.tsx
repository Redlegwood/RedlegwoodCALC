'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, FileUp, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Supplier {
  id: number;
  name: string;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error' | 'aborting';

export default function UploadDocsModule() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ fileUrl: string; fileName: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<Array<{id: number; supplierName: string; fileName: string; uploadedAt: string; inserted: number; updated: number; total: number; fileUrl?: string | null}>>([]);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/suppliers').then((r: Response) => r?.json?.()).then((d: any) => {
      setSuppliers(Array.isArray(d) ? d : []);
    }).catch((e: any) => console.error(e));
  
    fetchDocuments();}, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/upload/documents');
      if (res.ok) {
        const data = await res.json();
        setUploadedDocs(data);
      }
    } catch (err) {
      console.error('Failed to fetch uploaded documents:', err);
    }
  };

  const resetForm = useCallback(() => {
    setFile(null);
    setUploadState('idle');
    setProgress(0);
    setResult(null);
    setErrorMsg('');
    if (fileInputRef?.current) fileInputRef.current.value = '';
  }, []);

  const handleAddSupplier = async () => {
    const name = newSupplierName.trim();
    if (!name) return;
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to create supplier');
      const created = await res.json();
      setSuppliers((prev: Supplier[]) => [...(prev ?? []), created]);
      setSelectedSupplierId(String(created?.id ?? ''));
      setNewSupplierName('');
      setShowNewSupplier(false);
      toast.success(`Supplier "${name}" added`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to add supplier');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e?.target?.files?.[0] ?? null;
    if (f && f?.type !== 'application/pdf') {
      toast.error('Only PDF files are accepted');
      if (fileInputRef?.current) fileInputRef.current.value = '';
      return;
    }
    setFile(f);
    setResult(null);
    setErrorMsg('');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e?.preventDefault?.();
    const f = e?.dataTransfer?.files?.[0] ?? null;
    if (f && f?.type !== 'application/pdf') {
      toast.error('Only PDF files are accepted');
      return;
    }
    setFile(f);
    setResult(null);
    setErrorMsg('');
  };

  const handleUpload = async () => {
    if (!selectedSupplierId) {
      toast.error('Please select a supplier first');
      return;
    }
    if (!file) {
      toast.error('Please select a PDF file');
      return;
    }

    setUploadState('uploading');
    setProgress(10);
    setResult(null);
    setErrorMsg('');

    const controller = new AbortController();
    abortRef.current = controller;

    // Timeout after 45 seconds
    timeoutRef.current = setTimeout(() => {
      controller?.abort?.();
      setUploadState('error');
      setErrorMsg('Upload timed out — please retry');
      toast.error('Upload timed out — please retry');
    }, 45000);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev: number) => {
        if ((prev ?? 0) >= 90) return prev;
        return (prev ?? 0) + Math.random() * 15;
      });
    }, 500);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('supplier_id', selectedSupplierId);

      const res = await fetch('/api/upload/pdf', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearInterval(progressInterval);
      if (timeoutRef?.current) clearTimeout(timeoutRef.current);
      setProgress(100);

      if (!res?.ok) {
        const errData = await res?.json?.().catch(() => ({}));
        throw new Error(errData?.error ?? 'Upload failed');
      }

      const data = await res.json();
      setResult({
        fileUrl: data?.fileUrl ?? '',
        fileName: data?.fileName ?? '',
      });
      setUploadState('success');
      await fetchDocuments();;
      toast.success('Document uploaded successfully');

      setTimeout(() => {
        resetForm();
      }, 3000);
    } catch (err: any) {
      clearInterval(progressInterval);
      if (timeoutRef?.current) clearTimeout(timeoutRef.current);

      if (err?.name === 'AbortError') {
        setUploadState('idle');
        setProgress(0);
        return;
      }

      setUploadState('error');
      setErrorMsg(err?.message ?? 'Upload failed');
      toast.error(err?.message ?? 'Upload failed');
    }
  };

  const handleAbort = () => {
    abortRef?.current?.abort?.();
    if (timeoutRef?.current) clearTimeout(timeoutRef.current);
    resetForm();
  };

  const isUploading = uploadState === 'uploading';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Upload className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Upload Docs</h2>
      </div>
      <p className="text-muted-foreground">Upload supplier price sheet.</p>

      <div className="bg-card rounded-xl p-6 shadow space-y-4">
        {/* Supplier selector */}
        <div>
          <label className="block text-sm font-medium mb-1">Supplier *</label>
          <select
            value={selectedSupplierId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const val = e?.target?.value ?? '';
              if (val === '__add_new__') { setShowNewSupplier(true); setSelectedSupplierId(''); }
              else { setSelectedSupplierId(val); setShowNewSupplier(false); }
            }}
            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
            disabled={isUploading}
          >
            <option value="">Select supplier...</option>
            {(suppliers ?? []).map((s: Supplier) => (
              <option key={s?.id} value={String(s?.id)}>{s?.name ?? ''}</option>
            ))}
              <option value="__add_new__">+ Add new supplier</option>
          </select>
          {showNewSupplier && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSupplier()}
                placeholder="New supplier name..."
                className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                autoFocus
              />
              <button onClick={handleAddSupplier} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition">Add</button>
              <button onClick={() => { setShowNewSupplier(false); setNewSupplierName(''); }} className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition">Cancel</button>
            </div>
          )}
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e: React.DragEvent<HTMLDivElement>) => e?.preventDefault?.()}
          onClick={() => { if (!isUploading) fileInputRef?.current?.click?.(); }}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/30'
          } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <FileUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          {file ? (
            <div>
              <p className="font-medium">{file?.name ?? 'Selected file'}</p>
              <p className="text-sm text-muted-foreground">{((file?.size ?? 0) / 1024 / 1024)?.toFixed?.(2) ?? '0'} MB</p>
            </div>
          ) : (
            <div>
              <p className="font-medium">Drag and drop a PDF here, or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">Only PDF files accepted (max 20MB)</p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Uploading document...</span>
              <span>{Math.round(progress ?? 0)}%</span>
            </div>
            <div className="w-full bg-background rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${Math.min(progress ?? 0, 100)}%` }} />
            </div>
          </div>
        )}

        {/* Success state */}
        {uploadState === 'success' && result && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium text-green-400">Document uploaded successfully!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {result?.fileName}
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {uploadState === 'error' && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">{errorMsg ?? 'Upload failed'}</p>
              <p className="text-sm text-muted-foreground mt-1">Please try again.</p>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          {isUploading ? (
            <button onClick={handleAbort} className="flex items-center gap-2 bg-destructive text-destructive-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition shadow">
              <XCircle className="w-4 h-4" /> Abort
            </button>
          ) : (
            <button
              onClick={handleUpload}
              disabled={!file || !selectedSupplierId}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" /> Upload Document
            </button>
          )}
          {!isUploading && (
            <button onClick={resetForm} className="px-6 py-2.5 rounded-lg font-medium bg-secondary text-secondary-foreground hover:bg-accent transition">
              Reset
            </button>
          )}
        </div>

        {(suppliers ?? [])?.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4" />
            No suppliers found. Create a supplier first in the Suppliers module.
          </div>
        )}
      </div>

      {/* Uploaded Documents List */}
      {uploadedDocs.length > 0 && (
        <div className="bg-card rounded-xl p-6 shadow space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            Uploaded Documents
          </h3>
          <ul className="divide-y divide-border">
            {uploadedDocs.map((doc, i) => {
              const d = new Date(doc.uploadedAt);
              const day = String(d.getDate()).padStart(2, '0');
              const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
              const year = String(d.getFullYear());
              const dateStr = day + month + year;
              const rawName = doc.fileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
              return (
                <li key={doc.id} className="py-2.5 flex items-center gap-2 text-sm">
                  <FileUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  {doc.fileUrl ? (
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{doc.supplierName}</a>
                  ) : (
                    <span className="font-medium">{doc.supplierName}</span>
                  )}
                  <span className="text-muted-foreground">,</span>
                  {doc.fileUrl ? (
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary hover:underline">{rawName}</a>
                  ) : (
                    <span className="text-muted-foreground">{rawName}</span>
                  )}
                  <span className="text-muted-foreground">,</span>
                  <span className="text-muted-foreground">{dateStr}</span>
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => {}} className="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:opacity-80 transition">Update</button>
                    <button onClick={() => {}} className="px-2 py-1 text-xs rounded bg-destructive text-destructive-foreground hover:opacity-80 transition">Delete</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
