import { useState, useEffect } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { testConnection, ConnectionTestResult } from "@/lib/sheets-api";
import { toast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Link, CheckCircle, AlertCircle, Loader2, RefreshCw, Copy, FileSpreadsheet } from "lucide-react";

export default function Settings() {
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [connectionData, setConnectionData] = useState<ConnectionTestResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);

  const runConnectionTest = async () => {
    setIsTesting(true);
    setConnectionStatus('loading');
    setErrorMessage('');
    
    try {
      const result = await testConnection();
      setConnectionData(result);
      setConnectionStatus('connected');
      toast({
        title: "Connection successful",
        description: `Connected to "${result.title}"`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setErrorMessage(message);
      setConnectionStatus('error');
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    runConnectionTest();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Email address copied",
    });
  };

  const isSheetNotFound = errorMessage.includes('SHEET_NOT_FOUND');

  return (
    <AppLayout>
      <PageHeader 
        title="Settings" 
        subtitle="Configure your app"
        showBack
      />
      
      <div className="px-4 py-6 max-w-lg mx-auto space-y-6 animate-fade-in">
        {/* Connection Status */}
        {connectionStatus === 'loading' && (
          <Card className="border-muted">
            <CardContent className="p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm font-medium">Testing connection...</span>
            </CardContent>
          </Card>
        )}

        {connectionStatus === 'connected' && connectionData && (
          <Card className="border-success/50 bg-success/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-success">Connected Successfully</span>
              </div>
              
              <div className="bg-background rounded-lg p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{connectionData.title}</span>
                </div>
                <p className="text-muted-foreground">
                  Sheets: {connectionData.sheets.join(', ')}
                </p>
                <p className="text-xs text-muted-foreground">
                  ID: {connectionData.spreadsheetIdMasked}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {connectionStatus === 'error' && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <span className="text-sm font-medium text-destructive">Connection Failed</span>
              </div>
              
              <div className="bg-background rounded-lg p-3 space-y-3 text-sm">
                {isSheetNotFound ? (
                  <>
                    <p className="font-medium text-foreground">
                      Spreadsheet not found or not shared
                    </p>
                    <div className="space-y-2 text-muted-foreground">
                      <p>Please share your Google Sheet with this email:</p>
                      <div className="flex items-center gap-2 bg-muted p-2 rounded font-mono text-xs break-all">
                        <span className="flex-1">
                          {errorMessage.split(': ').pop()}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 shrink-0"
                          onClick={() => copyToClipboard(errorMessage.split(': ').pop() || '')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <ol className="list-decimal list-inside space-y-1 mt-2">
                        <li>Open your Google Sheet</li>
                        <li>Click "Share" button</li>
                        <li>Paste the email above</li>
                        <li>Give "Editor" access</li>
                        <li>Click "Test Connection" below</li>
                      </ol>
                    </div>
                  </>
                ) : (
                  <p className="text-destructive">{errorMessage}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Connection Button */}
        <Button 
          onClick={runConnectionTest}
          disabled={isTesting}
          variant="outline"
          className="w-full"
        >
          {isTesting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          {isTesting ? "Testing..." : "Test Connection"}
        </Button>

        {/* Google Sheets Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              Google Sheets Integration
            </CardTitle>
            <CardDescription>
              Your app is configured to use Google Sheets as backend
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-2">
              <p className="font-medium">How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Spreadsheet ID is securely stored in backend</li>
                <li>Service account handles authentication</li>
                <li>Works across all devices automatically</li>
                <li>No manual configuration needed per device</li>
              </ul>
            </div>

            {connectionStatus === 'connected' && connectionData && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-2">Service Account Email:</p>
                <div className="flex items-center gap-2 bg-background p-2 rounded font-mono text-xs break-all">
                  <span className="flex-1">{connectionData.serviceAccountEmail}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={() => copyToClipboard(connectionData.serviceAccountEmail)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* App Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              App Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>PWA Status:</strong> Ready to install</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
