'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Upload } from 'lucide-react';

interface BatchUploadResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function BatchURLUpload() {
  const [urls, setUrls] = useState('');
  const [frequency, setFrequency] = useState('1 week');
  const [priority, setPriority] = useState('5');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BatchUploadResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      // Parse URLs from textarea (one per line)
      const urlList = urls
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      if (urlList.length === 0) {
        setResult({
          success: 0,
          failed: 0,
          errors: ['Please enter at least one URL'],
        });
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/admin/batch-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: urlList,
          frequency,
          priority: parseInt(priority),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload URLs');
      }

      setResult(data);

      // Clear form on success
      if (data.success > 0 && data.failed === 0) {
        setUrls('');
      }
    } catch (error) {
      console.error('Batch upload error:', error);
      setResult({
        success: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Batch URL Upload
        </CardTitle>
        <CardDescription>
          Schedule multiple URLs for periodic scraping. URLs will be automatically scraped and
          updated based on the frequency you choose.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="urls">URLs (one per line)</Label>
            <Textarea
              id="urls"
              placeholder="https://nantucketma.portal.civicclerk.com/
https://www.nantucket-ma.gov/AgendaCenter
https://www.nantucket-ma.gov/DocumentCenter"
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              Paste URLs, one per line. Invalid URLs will be skipped.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Scrape Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1 day">Daily</SelectItem>
                  <SelectItem value="3 days">Every 3 Days</SelectItem>
                  <SelectItem value="1 week">Weekly</SelectItem>
                  <SelectItem value="2 weeks">Bi-Weekly</SelectItem>
                  <SelectItem value="1 month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority (1-10)</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Lowest</SelectItem>
                  <SelectItem value="3">3 - Low</SelectItem>
                  <SelectItem value="5">5 - Normal</SelectItem>
                  <SelectItem value="7">7 - High</SelectItem>
                  <SelectItem value="10">10 - Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={isLoading || !urls.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload URLs
              </>
            )}
          </Button>
        </form>

        {result && (
          <div className="mt-4 space-y-2">
            {result.success > 0 && (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  Successfully scheduled {result.success} URL{result.success !== 1 ? 's' : ''} for
                  scraping.
                </AlertDescription>
              </Alert>
            )}

            {result.failed > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-1">
                    Failed to schedule {result.failed} URL{result.failed !== 1 ? 's' : ''}:
                  </div>
                  <ul className="list-disc list-inside space-y-1">
                    {result.errors.map((error, i) => (
                      <li key={i} className="text-sm">
                        {error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
