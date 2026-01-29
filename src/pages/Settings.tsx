import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { testConnection, ConnectionTestResult } from "@/lib/sheets-api";
import { toast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Link, CheckCircle, AlertCircle, Loader2, RefreshCw, Copy, FileSpreadsheet, User, Trash2, UserCog, Clock, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getDeviceHandler, clearDeviceHandler, DeviceHandler, getHandlerExpiryHours } from "@/lib/handler-memory";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [connectionData, setConnectionData] = useState<ConnectionTestResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);
  const [deviceHandler, setDeviceHandler] = useState<DeviceHandler | null>(null);
  const [expiryHours, setExpiryHours] = useState<number | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Load device handler on mount
  useEffect(() => {
    setDeviceHandler(getDeviceHandler());
    setExpiryHours(getHandlerExpiryHours());
  }, []);

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

  const handleClearDevice = () => {
    clearDeviceHandler();
    setDeviceHandler(null);
    toast({
      title: "Device cleared",
      description: "You'll need to select your handler again",
    });
  };

  const handleChangeHandler = () => {
    clearDeviceHandler();
    setDeviceHandler(null);
    navigate('/');
    toast({
      title: "Handler cleared",
      description: "Pull down on Dashboard to select new handler",
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
        {/* Device Handler Section */}
        <Card className={deviceHandler ? "border-primary/30 bg-primary/5" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              Device Handler
            </CardTitle>
            <CardDescription>
              {deviceHandler 
                ? "This device auto-opens your tasks" 
                : "No handler registered for this device"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {deviceHandler ? (
              <>
                <div className="bg-background rounded-lg p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {deviceHandler.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{deviceHandler.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Registered {new Date(deviceHandler.setAt).toLocaleDateString()}
                    </p>
                    {expiryHours !== null && expiryHours > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-amber-500">
                        <Clock className="w-3 h-3" />
                        <span>Resets in ~{expiryHours} hour{expiryHours !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleChangeHandler}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Change Handler
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear Device Registration?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove {deviceHandler.name} from this device. 
                          You'll need to select a handler again on next visit.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearDevice}>Clear</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Go to Dashboard and pull down to trigger handler selection
                </p>
                <Button variant="outline" onClick={() => navigate('/')}>
                  Go to Dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

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
            {user && (
              <p><strong>Logged in as:</strong> {user.email}</p>
            )}
          </CardContent>
        </Card>

        {/* Logout Section */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <LogOut className="w-5 h-5" />
              Sign Out
            </CardTitle>
            <CardDescription>
              Sign out of your account on this device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign Out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You'll need to sign in again to access the app.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Sign Out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
