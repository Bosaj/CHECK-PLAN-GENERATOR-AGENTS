import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import fraudResultService from '../services/fraudResultService';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Button,
    Chip,
    Alert,
    Grid,
    Card,
    CardContent,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress
} from '@mui/material';
import {
    Search as SearchIcon,
    FilterList as FilterIcon,
    Refresh as RefreshIcon,
    Info as InfoIcon
} from '@mui/icons-material';

const FraudResults = () => {
    const { agentId } = useParams();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [storeName, setStoreName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        fraudulent: 0,
        totalAmount: 0
    });
    const [selectedResult, setSelectedResult] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    useEffect(() => {
        fetchResults();
    }, [agentId, filter]);

    const fetchResults = async () => {
        try {
            setLoading(true);
            let response;
            switch (filter) {
                case 'ordered':
                    response = await fraudResultService.getFraudResultsOrdered(agentId);
                    break;
                case 'fraudulent':
                    response = await fraudResultService.getFraudulentResults(agentId);
                    break;
                case 'store':
                    if (storeName) {
                        response = await fraudResultService.getResultsByStore(agentId, storeName);
                    } else {
                        response = await fraudResultService.getFraudResultsByAgentId(agentId);
                    }
                    break;
                default:
                    response = await fraudResultService.getFraudResultsByAgentId(agentId);
            }
            setResults(response.data);
            calculateStats(response.data);
            setError(null);
        } catch (err) {
            setError('Error fetching results: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data) => {
        const stats = {
            total: data.length,
            fraudulent: data.filter(r => r.fraude === 'Oui').length,
            totalAmount: data.reduce((sum, r) => sum + (r.montantTotal || 0), 0)
        };
        setStats(stats);
    };

    const handleFilterChange = (event) => {
        setFilter(event.target.value);
    };

    const handleStoreSearch = () => {
        fetchResults();
    };

    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleRefresh = () => {
        fetchResults();
    };

    const handleViewDetails = (result) => {
        setSelectedResult(result);
        setDetailsOpen(true);
    };

    const filteredResults = results.filter(result =>
        result.nomDuCommerce?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.ville?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.adresseComplete?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
                {/* Header Section */}
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h4">
                            Fraud Results for Agent {agentId}
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<RefreshIcon />}
                            onClick={handleRefresh}
                        >
                            Refresh
                        </Button>
                    </Box>
                </Grid>

                {/* Stats Cards */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Total Cases
                            </Typography>
                            <Typography variant="h4">
                                {stats.total}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Fraudulent Cases
                            </Typography>
                            <Typography variant="h4" color="error">
                                {stats.fraudulent}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Total Amount
                            </Typography>
                            <Typography variant="h4">
                                {stats.totalAmount.toFixed(2)} €
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Filters and Search */}
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                        <FormControl sx={{ minWidth: 200 }}>
                            <InputLabel>Filter Results</InputLabel>
                            <Select
                                value={filter}
                                label="Filter Results"
                                onChange={handleFilterChange}
                                startAdornment={<FilterIcon sx={{ mr: 1 }} />}
                            >
                                <MenuItem value="all">All Results</MenuItem>
                                <MenuItem value="ordered">Ordered by Date</MenuItem>
                                <MenuItem value="fraudulent">Fraudulent Only</MenuItem>
                                <MenuItem value="store">By Store</MenuItem>
                            </Select>
                        </FormControl>

                        {filter === 'store' && (
                            <>
                                <TextField
                                    label="Store Name"
                                    value={storeName}
                                    onChange={(e) => setStoreName(e.target.value)}
                                    sx={{ minWidth: 200 }}
                                />
                                <Button
                                    variant="contained"
                                    onClick={handleStoreSearch}
                                >
                                    Search Store
                                </Button>
                            </>
                        )}

                        <TextField
                            label="Search"
                            value={searchTerm}
                            onChange={handleSearch}
                            sx={{ minWidth: 200 }}
                            InputProps={{
                                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            }}
                        />
                    </Box>
                </Grid>

                {/* Results Table */}
                <Grid item xs={12}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Store Name</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Amount</TableCell>
                                        <TableCell>Location</TableCell>
                                        <TableCell>Fraud Status</TableCell>
                                        <TableCell>Reasons</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredResults.map((result) => (
                                        <TableRow key={result.id}>
                                            <TableCell>{result.nomDuCommerce}</TableCell>
                                            <TableCell>{result.dateFacture}</TableCell>
                                            <TableCell>{result.montantTotal} €</TableCell>
                                            <TableCell>{result.ville}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={result.fraude}
                                                    color={result.fraude === 'Oui' ? 'error' : 'success'}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {result.raison && result.raison.map((reason, index) => (
                                                    <Chip
                                                        key={index}
                                                        label={reason}
                                                        size="small"
                                                        sx={{ mr: 0.5, mb: 0.5 }}
                                                    />
                                                ))}
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title="View Details">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleViewDetails(result)}
                                                    >
                                                        <InfoIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Grid>
            </Grid>

            {/* Details Dialog */}
            <Dialog
                open={detailsOpen}
                onClose={() => setDetailsOpen(false)}
                maxWidth="md"
                fullWidth
            >
                {selectedResult && (
                    <>
                        <DialogTitle>
                            Details for {selectedResult.nomDuCommerce}
                        </DialogTitle>
                        <DialogContent>
                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2">File Name</Typography>
                                    <Typography>{selectedResult.nom_fichier}</Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2">Date</Typography>
                                    <Typography>{selectedResult.dateFacture}</Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2">Amount</Typography>
                                    <Typography>{selectedResult.montantTotal} €</Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2">Location</Typography>
                                    <Typography>{selectedResult.ville}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2">Complete Address</Typography>
                                    <Typography>{selectedResult.adresseComplete}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2">Fraud Status</Typography>
                                    <Chip
                                        label={selectedResult.fraude}
                                        color={selectedResult.fraude === 'Oui' ? 'error' : 'success'}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2">Reasons</Typography>
                                    <Box sx={{ mt: 1 }}>
                                        {selectedResult.raison && selectedResult.raison.map((reason, index) => (
                                            <Chip
                                                key={index}
                                                label={reason}
                                                sx={{ mr: 1, mb: 1 }}
                                            />
                                        ))}
                                    </Box>
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDetailsOpen(false)}>Close</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
};

export default FraudResults; 