import { useState, useRef, useEffect } from 'react';
import { Annotation } from '../api/drafts';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up the worker using the version from pdfjs-dist
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfAnnotationCanvasProps {
    pdfUrl: string;
    annotations: Annotation[];
    onAnnotationsChange: (annotations: Annotation[]) => void;
    fontSize: number;
    fontFamily: string;
    color: string;
    bold: boolean;
    italic: boolean;
}

export default function PdfAnnotationCanvas({
    pdfUrl,
    annotations,
    onAnnotationsChange,
    fontSize,
    fontFamily,
    color,
    bold,
    italic,
}: PdfAnnotationCanvasProps) {
    const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
    const [drawEnd, setDrawEnd] = useState<{ x: number; y: number } | null>(null);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [pageWidth, setPageWidth] = useState<number>(0);
    const [pageHeight, setPageHeight] = useState<number>(0);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isImage, setIsImage] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const selectedAnnotation = annotations.find(a => a.id === selectedAnnotationId);

    // Fetch PDF as blob manually to ensure auth works and avoid CORS issues
    useEffect(() => {
        let active = true;
        const fetchPdf = async () => {
            try {
                setLoading(true);
                setError(null);
                console.log('Fetching PDF from:', pdfUrl);
                const token = localStorage.getItem('token') ? JSON.parse(localStorage.getItem('token')!).token : '';

                const response = await axios.get(pdfUrl, {
                    responseType: 'blob',
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (active) {
                    const url = URL.createObjectURL(response.data);
                    setBlobUrl(url);
                    setLoading(false);
                }
            } catch (err) {
                if (active) {
                    console.error('Error fetching PDF:', err);
                    setError('Failed to download PDF file (Network/Auth error).');
                    setLoading(false);
                }
            }
        };

        if (pdfUrl) {
            fetchPdf();
        }

        return () => {
            active = false;
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, [pdfUrl]);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // Check if clicking on an existing annotation
        const target = e.target as HTMLElement;
        if (target.closest('.annotation-text')) {
            return; // Let the annotation click handler deal with it
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        setIsDrawing(true);
        setDrawStart({ x, y });
        setDrawEnd({ x, y });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isDrawing && drawStart) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            setDrawEnd({ x, y });
        } else if (isDragging && dragStart && selectedAnnotationId) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;

            const deltaX = x - dragStart.x;
            const deltaY = y - dragStart.y;

            onAnnotationsChange(
                annotations.map((ann) =>
                    ann.id === selectedAnnotationId
                        ? { ...ann, x: ann.x + deltaX, y: ann.y + deltaY }
                        : ann
                )
            );

            setDragStart({ x, y });
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isDrawing && drawStart && drawEnd) {
            const centerX = (drawStart.x + drawEnd.x) / 2;
            const centerY = (drawStart.y + drawEnd.y) / 2;

            // Only add if drawing distance is significant, else it's a click
            const distance = Math.sqrt(Math.pow(drawEnd.x - drawStart.x, 2) + Math.pow(drawEnd.y - drawStart.y, 2));

            if (distance > 0.01) { // Threshold to prevent accidental clicks creating boxes
                const newAnnotation: Annotation = {
                    id: `annotation-${Date.now()}`,
                    text: 'Text',
                    x: centerX,
                    y: centerY,
                    fontSize,
                    fontFamily,
                    color,
                    bold,
                    italic,
                    pageNumber: 1,
                };

                onAnnotationsChange([...annotations, newAnnotation]);
                setSelectedAnnotationId(newAnnotation.id);
            }
        }

        setIsDrawing(false);
        setIsDragging(false);
        setDrawStart(null);
        setDrawEnd(null);
        setDragStart(null);
    };

    const handleAnnotationMouseDown = (e: React.MouseEvent, annotationId: string) => {
        e.stopPropagation();
        setSelectedAnnotationId(annotationId);

        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            setDragStart({ x, y });
            setIsDragging(true);
        }
    };

    const handleAnnotationTextChange = (id: string, newText: string) => {
        onAnnotationsChange(
            annotations.map((ann) =>
                ann.id === id ? { ...ann, text: newText } : ann
            )
        );
    };

    const handleAnnotationFontSizeChange = (id: string, newSize: number) => {
        onAnnotationsChange(
            annotations.map((ann) =>
                ann.id === id ? { ...ann, fontSize: newSize } : ann
            )
        );
    };

    const handleDeleteAnnotation = (id: string) => {
        onAnnotationsChange(annotations.filter((ann) => ann.id !== id));
        if (selectedAnnotationId === id) {
            setSelectedAnnotationId(null);
        }
    };

    const getDrawingRect = () => {
        if (!drawStart || !drawEnd) return null;
        const left = Math.min(drawStart.x, drawEnd.x) * 100;
        const top = Math.min(drawStart.y, drawEnd.y) * 100;
        const width = Math.abs(drawEnd.x - drawStart.x) * 100;
        const height = Math.abs(drawEnd.y - drawStart.y) * 100;
        return { left, top, width, height };
    };

    const drawingRect = getDrawingRect();

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        setPageWidth(img.naturalWidth);
        setPageHeight(img.naturalHeight);
    };

    // Configure react-pdf options for local resources
    const options = {
        cMapUrl: '/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: '/standard_fonts/'
    };

    const renderOverlay = () => (
        <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                cursor: isDragging ? 'grabbing' : isDrawing ? 'crosshair' : 'crosshair',
                zIndex: 10
            }}
        >
            {/* Drawing preview */}
            {isDrawing && drawingRect && (
                <div
                    style={{
                        position: 'absolute',
                        left: `${drawingRect.left}%`,
                        top: `${drawingRect.top}%`,
                        width: `${drawingRect.width}%`,
                        height: `${drawingRect.height}%`,
                        border: '2px dashed #007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    }}
                />
            )}

            {/* Annotations */}
            {annotations.map((annotation) => (
                <div
                    key={annotation.id}
                    className="annotation-text"
                    style={{
                        position: 'absolute',
                        left: `${annotation.x * 100}%`,
                        top: `${annotation.y * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        cursor: isDragging && selectedAnnotationId === annotation.id ? 'grabbing' : 'grab',
                        zIndex: selectedAnnotationId === annotation.id ? 1000 : 100,
                    }}
                    onMouseDown={(e) => handleAnnotationMouseDown(e, annotation.id)}
                >
                    <div
                        style={{
                            fontSize: `${annotation.fontSize}px`,
                            fontFamily: annotation.fontFamily,
                            color: annotation.color,
                            fontWeight: annotation.bold ? 'bold' : 'normal',
                            fontStyle: annotation.italic ? 'italic' : 'normal',
                            backgroundColor: selectedAnnotationId === annotation.id ? 'rgba(255, 255, 0, 0.3)' : 'transparent',
                            padding: selectedAnnotationId === annotation.id ? '2px 4px' : '0',
                            whiteSpace: 'nowrap',
                            border: selectedAnnotationId === annotation.id ? '1px dashed #007bff' : 'none',
                            borderRadius: selectedAnnotationId === annotation.id ? '2px' : '0',
                            userSelect: 'none'
                        }}
                    >
                        {annotation.text}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Viewer Container */}
            <div
                style={{
                    border: '2px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: '#525659',
                    padding: '1rem',
                    display: 'flex',
                    justifyContent: 'center',
                    minHeight: '600px',
                    maxHeight: '80vh',
                    overflow: 'auto',
                    position: 'relative'
                }}
            >
                <div style={{ position: 'relative' }} ref={containerRef}>
                    {loading && <div style={{ color: 'white' }}>Loading content...</div>}
                    {error && <div style={{ color: '#ff6b6b' }}>{error}</div>}

                    {blobUrl && !loading && !error && (
                        isImage ? (
                            // Image Renderer
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <img
                                    src={blobUrl}
                                    alt="Template"
                                    onLoad={handleImageLoad}
                                    style={{ maxWidth: '100%', display: 'block' }}
                                    draggable={false}
                                />
                                {renderOverlay()}
                            </div>
                        ) : (
                            // PDF Renderer
                            <Document
                                file={blobUrl}
                                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                                onLoadError={(err) => console.error('PDF Render Error:', err)}
                                loading={<div style={{ color: 'white' }}>Rendering PDF...</div>}
                                error={<div style={{ color: '#ff6b6b' }}>Failed to render PDF content (Worker/Format error).</div>}
                                options={options}
                            >
                                <Page
                                    pageNumber={1}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    width={800}
                                    onLoadSuccess={({ width, height }) => {
                                        setPageWidth(width);
                                        setPageHeight(height);
                                    }}
                                />
                                {renderOverlay()}
                            </Document>
                        )
                    )}
                </div>
            </div>

            {/* Editor Panel components... (same as before) */}
            {selectedAnnotationId && selectedAnnotation && (
                <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
                    <h4 style={{ marginTop: 0 }}>Edit Annotation</h4>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Text:
                            <input type="text" value={selectedAnnotation.text} onChange={(e) => handleAnnotationTextChange(selectedAnnotationId, e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }} autoFocus />
                        </label>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Font Size:
                            <select value={selectedAnnotation.fontSize} onChange={(e) => handleAnnotationFontSizeChange(selectedAnnotationId, Number(e.target.value))}
                                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}>
                                <option value={8}>8pt</option><option value={10}>10pt</option><option value={12}>12pt</option>
                                <option value={14}>14pt</option><option value={16}>16pt</option><option value={18}>18pt</option>
                                <option value={20}>20pt</option><option value={24}>24pt</option>
                            </select>
                        </label>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setSelectedAnnotationId(null)} style={{ padding: '0.5rem 1rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Done</button>
                        <button onClick={() => handleDeleteAnnotation(selectedAnnotationId)} style={{ padding: '0.5rem 1rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                    </div>
                </div>
            )}

            <div style={{ padding: '1rem', backgroundColor: '#e7f3ff', border: '1px solid #b3d9ff', borderRadius: '4px' }}>
                <strong>💡 Tool Tips:</strong>
                <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
                    <li><strong>Click and drag</strong> to create a text box area</li>
                    <li><strong>Text is invisible</strong> until selected</li>
                    <li><strong>Click text</strong> to edit or move it</li>
                </ul>
            </div>
        </div>
    );
}
