import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const downloadReceiptPDF = async (htmlContent: string, fileName: string) => {
    // Use an iframe for complete CSS isolation from the main page
    // This prevents html2canvas from encountering unsupported CSS color functions like lab()
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '0';
    iframe.style.width = '210mm'; // A4 width
    iframe.style.height = '297mm'; // A4 height
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    try {
        // Wait for iframe to be ready
        await new Promise<void>((resolve) => {
            iframe.onload = () => resolve();
            // Write the complete HTML document to the iframe
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
                iframeDoc.open();
                iframeDoc.write(htmlContent);
                iframeDoc.close();
            }
            // Fallback resolve in case onload doesn't fire
            setTimeout(resolve, 100);
        });

        // Wait a bit more for styles/fonts to render
        await new Promise(resolve => setTimeout(resolve, 500));

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc || !iframeDoc.body) {
            throw new Error('Could not access iframe document');
        }

        // Get the content container from iframe
        const contentElement = iframeDoc.body;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const canvas = await html2canvas(contentElement, {
            scale: 2, // Higher scale for better quality
            logging: false,
            useCORS: true,
            backgroundColor: '#ffffff',
            // Use the iframe's window context
            windowWidth: contentElement.scrollWidth,
            windowHeight: contentElement.scrollHeight,
        } as any);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();

        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Handle multiple pages if content is longer than one page
        const pdfHeight = pdf.internal.pageSize.getHeight();
        if (imgHeight <= pdfHeight) {
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        } else {
            // For longer content, we need to split into pages
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
        }

        pdf.save(fileName);

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Gagal mendownload PDF. Silakan coba lagi.');
    } finally {
        document.body.removeChild(iframe);
    }
};
