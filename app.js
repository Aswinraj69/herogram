// Import API service
import { 
  login, register, getProfile, 
  createTitle, getTitles, getTitle, updateTitle, deleteTitle,
  uploadReference, getReferences, getGlobalReferences, deleteReference,
  generatePaintings, getThumbnails as getPaintings,
  connectSSE, disconnectSSE
} from './frontend/apiService.js';

// Data Storage
let titles = [];
let globalReferences = [];
let currentTitle = null;
let currentReferenceDataMap = {};
let isLoading = true;
let currentUser = null;
let sseConnection = null;
let activeGenerations = new Map(); // Track active generation processes

// DOM Elements
const titleList = document.getElementById('title-list');
const titleInput = document.getElementById('title-input');
const customInstructions = document.getElementById('custom-instructions');
const quantitySelect = document.getElementById('quantity-select');
const generateBtn = document.getElementById('generate-btn');
const moreThumbnailsBtn = document.getElementById('more-thumbnails-btn');
const moreThumbnailsSection = document.getElementById('more-thumbnails-section');
const thumbnailsGrid = document.getElementById('thumbnails-grid');
const thumbnailsEmptyState = document.getElementById('thumbnails-empty-state');
const progressSection = document.getElementById('progress-section');
const ai1Progress = document.getElementById('ai1-progress');
const ai2Progress = document.getElementById('ai2-progress');
const ai1Status = document.getElementById('ai1-status');
const ai2Status = document.getElementById('ai2-status');
const newTitleBtn = document.getElementById('new-title-btn');
const globalReferenceToggle = document.getElementById('global-reference-toggle');
const globalReferencesSection = document.getElementById('global-references');
const titleReferencesSection = document.getElementById('title-references');
const globalDropzone = document.getElementById('global-dropzone');
const titleDropzone = document.getElementById('title-dropzone');
const globalFileInput = document.getElementById('global-file-input');
const titleFileInput = document.getElementById('title-file-input');
const globalUploadBtn = document.getElementById('global-upload-btn');
const titleUploadBtn = document.getElementById('title-upload-btn');
const globalReferenceImages = document.getElementById('global-reference-images');
const titleReferenceImages = document.getElementById('title-reference-images');
const promptModal = document.getElementById('prompt-modal');
const closeModal = document.querySelector('.close-modal');
const modalImage = document.getElementById('modal-image');
const promptSummary = document.getElementById('prompt-summary');
const promptTitle = document.getElementById('prompt-title');
const promptInstructions = document.getElementById('prompt-instructions');
const referenceCount = document.getElementById('reference-count');
const referenceThumbnails = document.getElementById('reference-thumbnails');
const fullPrompt = document.getElementById('full-prompt');
const loadingOverlay = document.getElementById('loading-overlay');
const refreshPaintingsBtn = document.getElementById('refresh-paintings-btn');

// Initialize the application
async function init() {
    console.log("Initializing app...");
    showLoading(true);
    
    // Set up event listeners first
    setupEventListeners();
    
    try {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (token) {
            console.log("Token found, getting user profile...");
            const response = await getProfile();
            currentUser = response.data.user;
            
            // Set username in the UI
            document.getElementById('username-display').textContent = currentUser.username;
            
            // Connect to SSE for real-time updates
            connectToSSE();
            
            // Load data
            await loadUserData();
        } else {
            console.log("No token found, showing login form...");
            showLoginForm();
        }
    } catch (error) {
        console.error('Failed to initialize app:', error);
        localStorage.removeItem('token');
        showLoginForm();
    } finally {
        showLoading(false);
    }
}

// Connect to Server-Sent Events for real-time updates
function connectToSSE() {
    if (!currentUser || !currentUser.id) return;
    
    sseConnection = connectSSE(currentUser.id, handleSSEMessage);
}

// Handle SSE messages
function handleSSEMessage(data) {
    switch (data.type) {
        case 'generation_started':
            handleGenerationStarted(data);
            break;
        case 'idea_progress':
            handleIdeaProgress(data);
            break;
        case 'idea_created':
            handleIdeaCreated(data);
            break;
        case 'ideas_complete':
            handleIdeasComplete(data);
            break;
        case 'image_processing_started':
            handleImageProcessingStarted(data);
            break;
        case 'image_processing':
            handleImageProcessing(data);
            break;
        case 'image_completed':
            handleImageCompleted(data);
            break;
        case 'image_failed':
            handleImageFailed(data);
            break;
        case 'generation_complete':
            handleGenerationComplete(data);
            break;
        case 'generation_error':
            alert('Generation error: ' + (data.error || 'Unknown error'));
            break;
        case 'connected':
            break;
        default:
            console.log('Unknown SSE message type:', data.type);
    }
}

// Handle generation started
function handleGenerationStarted(data) {
    const { titleId, quantity } = data;
    
    // Create placeholder containers for paintings
    createPaintingPlaceholders(titleId, quantity);
    
    // Show progress section
    progressSection.style.display = 'block';
    moreThumbnailsSection.style.display = 'none';
    
    // Initialize progress tracking
    activeGenerations.set(titleId, {
        totalQuantity: quantity,
        ideasGenerated: 0,
        imagesCompleted: 0,
        imagesFailed: 0,
        imagesProcessing: 0
    });
    
    // Update progress UI
    ai1Status.textContent = 'Generating painting ideas...';
    ai1Progress.style.width = '0%';
    ai2Status.textContent = 'Waiting for ideas...';
    ai2Progress.style.width = '0%';
}

// Handle idea generation progress
function handleIdeaProgress(data) {
    const { titleId, current, total } = data;
    const generation = activeGenerations.get(titleId);
    if (!generation) return;
    
    const progress = (current / total) * 100;
    ai1Progress.style.width = `${progress}%`;
    ai1Status.textContent = `Generating idea ${current} of ${total}...`;
}

// Handle idea created
function handleIdeaCreated(data) {
    const { titleId, ideaId, ideaIndex, summary } = data;
    const generation = activeGenerations.get(titleId);
    if (!generation) return;
    
    generation.ideasGenerated++;
    
    // Update the placeholder with idea info
    updatePaintingPlaceholder(titleId, ideaIndex, {
        status: 'idea_created',
        summary: summary,
        ideaId: ideaId
    });
}

// Handle ideas complete
function handleIdeasComplete(data) {
    const { titleId } = data;
    const generation = activeGenerations.get(titleId);
    if (!generation) return;
    
    ai1Progress.style.width = '100%';
    ai1Status.textContent = 'All ideas generated!';
    ai2Status.textContent = 'Starting image generation...';
}

// Handle image processing started
function handleImageProcessingStarted(data) {
    const { titleId, ideaId, ideaIndex } = data;
    const generation = activeGenerations.get(titleId);
    if (!generation) return;
    
    generation.imagesProcessing++;
    
    updatePaintingPlaceholder(titleId, ideaIndex, {
        status: 'processing',
        message: 'Starting image generation...'
    });
    
    updateOverallProgress(titleId);
}

// Handle image processing updates
function handleImageProcessing(data) {
    const { ideaId, message } = data;
    
    // Find the painting by ideaId and update its status
    const paintingElement = document.querySelector(`[data-idea-id="${ideaId}"]`);
    if (paintingElement) {
        const statusElement = paintingElement.querySelector('.painting-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }
}

// Handle image completed
function handleImageCompleted(data) {
    const { titleId, ideaId, ideaIndex, imageUrl } = data;
    const generation = activeGenerations.get(titleId);
    if (!generation) return;
    
    generation.imagesCompleted++;
    generation.imagesProcessing--;
    
    // Update the painting with the completed image
    updatePaintingPlaceholder(titleId, ideaIndex, {
        status: 'completed',
        imageUrl: imageUrl
    });
    
    updateOverallProgress(titleId);
    
    // Refresh the paintings list to show the completed image
    if (currentTitle && currentTitle.id === titleId) {
        setTimeout(() => {
            loadPaintings(titleId);
        }, 1000); // Small delay to ensure database is updated
    }
}

// Handle image failed
function handleImageFailed(data) {
    const { titleId, ideaId, ideaIndex, error } = data;
    const generation = activeGenerations.get(titleId);
    if (!generation) return;
    
    generation.imagesFailed++;
    generation.imagesProcessing--;
    
    updatePaintingPlaceholder(titleId, ideaIndex, {
        status: 'failed',
        error: error
    });
    
    updateOverallProgress(titleId);
}

// Handle generation complete
function handleGenerationComplete(data) {
    const { titleId } = data;
    
    ai2Progress.style.width = '100%';
    ai2Status.textContent = 'All images processed!';
    
    // Hide progress section after a delay
    setTimeout(() => {
        progressSection.style.display = 'none';
        moreThumbnailsSection.style.display = 'block';
    }, 2000);
    
    // Clean up generation tracking
    activeGenerations.delete(titleId);
    
    // Refresh the paintings display
    loadPaintings(titleId);
}

// Handle generation error
function handleGenerationError(data) {
    const { titleId, error } = data;
    
    alert(`Generation failed: ${error}`);
    progressSection.style.display = 'none';
    moreThumbnailsSection.style.display = 'block';
    
    // Clean up generation tracking
    activeGenerations.delete(titleId);
}

// Create placeholder containers for paintings
function createPaintingPlaceholders(titleId, quantity) {
    
    // Clear existing paintings
    thumbnailsGrid.innerHTML = '';
    thumbnailsEmptyState.style.display = 'none';
    
    // Create placeholders
    for (let i = 0; i < quantity; i++) {
        const placeholder = createPaintingPlaceholder(titleId, i);
        thumbnailsGrid.appendChild(placeholder);
    }
}

// Create a single painting placeholder
function createPaintingPlaceholder(titleId, index) {
    const placeholder = document.createElement('div');
    placeholder.className = 'painting-placeholder';
    placeholder.id = `painting-${titleId}-${index}`;
    placeholder.setAttribute('data-title-id', titleId);
    placeholder.setAttribute('data-index', index);
    
    placeholder.innerHTML = `
        <div class="painting-image">
            <div class="loading-spinner"></div>
        </div>
        <div class="painting-info">
            <div class="painting-status">Waiting to start...</div>
            <div class="painting-summary">-</div>
        </div>
    `;
    
    return placeholder;
}

// Update a painting placeholder
function updatePaintingPlaceholder(titleId, index, data) {
    const placeholder = document.getElementById(`painting-${titleId}-${index}`);
    if (!placeholder) return;
    
    const statusElement = placeholder.querySelector('.painting-status');
    const summaryElement = placeholder.querySelector('.painting-summary');
    const imageElement = placeholder.querySelector('.painting-image');
    
    if (data.status === 'idea_created') {
        statusElement.textContent = 'Idea created, waiting for image generation...';
        summaryElement.textContent = data.summary;
        placeholder.setAttribute('data-idea-id', data.ideaId);
    } else if (data.status === 'processing') {
        statusElement.textContent = data.message || 'Processing...';
        placeholder.classList.add('processing');
    } else if (data.status === 'completed') {
        statusElement.textContent = 'Completed!';
        placeholder.classList.remove('processing');
        placeholder.classList.add('completed');
        
        // Load the actual image
        if (data.imageUrl) {
            imageElement.innerHTML = `<img src="${data.imageUrl}" alt="Generated painting" onclick="showPromptDetails('${data.ideaId}')">`;
        }
    } else if (data.status === 'failed') {
        statusElement.textContent = `Failed: ${data.error}`;
        placeholder.classList.remove('processing');
        placeholder.classList.add('failed');
        imageElement.innerHTML = '<div class="error-icon">❌</div>';
    }
}

// Update overall progress
function updateOverallProgress(titleId) {
    const generation = activeGenerations.get(titleId);
    if (!generation) return;
    
    const total = generation.totalQuantity;
    const completed = generation.imagesCompleted + generation.imagesFailed;
    const progress = (completed / total) * 100;
    
    ai2Progress.style.width = `${progress}%`;
    ai2Status.textContent = `Generating images... ${completed}/${total} complete`;
}

// Show/hide loading indicator
function showLoading(show) {
    console.log("Loading indicator:", show ? "SHOWING" : "HIDING");
    isLoading = show;
    
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
    
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.disabled = show;
    });
}

// Load user data from server
async function loadUserData() {
    try {
        // Fetch titles
        console.log('Loading titles...');
        const titlesResponse = await getTitles();
        titles = titlesResponse.data.titles;
        
        // Fetch global references
        console.log('Loading global references...');
        const referencesResponse = await getGlobalReferences();
        globalReferences = referencesResponse.data.references;
        
        // Render UI
        renderTitlesList();
        renderReferenceImages(globalReferences, globalReferenceImages);
        
        // Show main app container
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';

        console.log('User data loading complete.');
    } catch (error) {
        console.error('Error loading user data:', error);
        alert('Failed to load data. Please try again.');
    }
}

// Show login form
function showLoginForm() {
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        showLoading(true);
        const response = await login(email, password);
        localStorage.setItem('token', response.data.token);
        currentUser = response.data.user;
        
        // Connect to SSE
        connectToSSE();
        
        await loadUserData();
    } catch (error) {
        console.error('Login error:', error);
        alert(error.response?.data?.error || 'Login failed. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Handle register
async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    if (!username || !email || !password) {
        alert("Please fill in all fields");
        return;
    }
    
    try {
        showLoading(true);
        const response = await register(username, email, password);
        localStorage.setItem('token', response.data.token);
        currentUser = response.data.user;
        
        document.getElementById('username-display').textContent = currentUser.username;
        
        // Connect to SSE
        connectToSSE();
        
        await loadUserData();
    } catch (error) {
        console.error('Registration error:', error);
        alert(error.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    
    // Disconnect SSE
    if (sseConnection) {
        disconnectSSE();
        sseConnection = null;
    }
    
    // Clear data
    titles = [];
    globalReferences = [];
    currentTitle = null;
    currentReferenceDataMap = {};
    activeGenerations.clear();
    
    // Reset UI
    titleList.innerHTML = '<div class="empty-state">No titles yet. Create your first one!</div>';
    thumbnailsGrid.innerHTML = '';
    thumbnailsEmptyState.style.display = 'block';
    progressSection.style.display = 'none';
    moreThumbnailsSection.style.display = 'none';
    
    showLoginForm();
}

// Load paintings for a specific title
async function loadPaintings(titleId) {
    try {
        const response = await getPaintings(titleId);
        const paintings = response.data.paintings || [];
        currentReferenceDataMap = response.data.referenceDataMap || {};
        
        renderPaintings(paintings);
    } catch (error) {
        console.error('Error loading paintings:', error);
    }
}

// Render paintings
function renderPaintings(paintings) {
    if (paintings.length === 0) {
        thumbnailsEmptyState.style.display = 'block';
        thumbnailsGrid.innerHTML = '';
        refreshPaintingsBtn.style.display = 'none';
        return;
    }
    
    thumbnailsEmptyState.style.display = 'none';
    thumbnailsGrid.innerHTML = '';
    refreshPaintingsBtn.style.display = 'block';
    
    paintings.forEach((painting, index) => {
        const paintingElement = createPaintingElement(painting, index);
        thumbnailsGrid.appendChild(paintingElement);
    });
}

// Create a painting element
function createPaintingElement(painting, index) {
    const element = document.createElement('div');
    element.className = 'painting-item';
    element.setAttribute('data-idea-id', painting.idea_id);
    
    let imageContent = '';
    if (painting.status === 'completed' && painting.image_url) {
        imageContent = `<img src="${painting.image_url}" alt="Generated painting" onclick="showPromptDetails('${painting.idea_id}')">`;
    } else if (painting.status === 'failed') {
        imageContent = '<div class="error-icon">❌</div>';
            } else {
        imageContent = '<div class="loading-spinner"></div>';
    }
    
    element.innerHTML = `
        <div class="painting-image">
            ${imageContent}
        </div>
        <div class="painting-info">
            <div class="painting-status ${painting.status}">${getStatusText(painting.status)}</div>
            <div class="painting-summary">${painting.summary || '-'}</div>
        </div>
    `;
    
    return element;
}

// Get status text
function getStatusText(status) {
    switch (status) {
        case 'pending': return 'Waiting to start...';
        case 'processing': return 'Processing...';
        case 'completed': return 'Completed!';
        case 'failed': return 'Failed';
        default: return 'Unknown';
    }
}

// Show prompt details modal
function showPromptDetails(ideaId) {
    // Find the painting with this idea ID
    const painting = findPaintingByIdeaId(ideaId);
    if (!painting) return;
    
    modalImage.src = painting.image_url || '';
    promptSummary.textContent = painting.promptDetails?.summary || '';
    promptTitle.textContent = painting.promptDetails?.title || '';
    promptInstructions.textContent = painting.promptDetails?.instructions || '';
    referenceCount.textContent = painting.promptDetails?.referenceCount || 0;
    fullPrompt.textContent = painting.promptDetails?.fullPrompt || '';
    
    // Show reference images
    renderReferenceThumbnails(painting.promptDetails?.referenceImages || []);
    
    promptModal.style.display = 'block';
}

// Find painting by idea ID
function findPaintingByIdeaId(ideaId) {
    // This would need to be implemented based on how you store paintings
    // For now, we'll need to fetch from server or store in memory
    return null;
}

// Render reference thumbnails in modal
function renderReferenceThumbnails(referenceIds) {
    referenceThumbnails.innerHTML = '';
    
    referenceIds.forEach(refId => {
        const refData = currentReferenceDataMap[refId];
        if (refData) {
            const img = document.createElement('img');
            img.src = refData;
            img.alt = 'Reference image';
            img.className = 'reference-thumbnail';
            referenceThumbnails.appendChild(img);
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.error('Login form not found!');
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    } else {
        console.error('Register form not found!');
    }
    
    // Show/hide forms
    document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('register-form').style.display = 'block';
        });
    
    document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('register-form').style.display = 'none';
            document.getElementById('login-form').style.display = 'block';
    });
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // New title button
    newTitleBtn.addEventListener('click', () => {
        const title = titleInput.value.trim();
        const instructions = customInstructions.value.trim();
        
        if (!title) {
            alert('Please enter a title');
            return;
        }
        
        createNewTitle(title, instructions);
    });
    
    // Generate button
    generateBtn.addEventListener('click', async () => {
        const title = titleInput.value.trim();
        const instructions = customInstructions.value.trim();
        
        if (!title) {
            alert('Please enter a title first');
            return;
        }
        
        const quantity = parseInt(quantitySelect.value) || 5;
        
        // If no title is selected, create one first
        if (!currentTitle) {
            try {
                showLoading(true);
                const response = await createTitle(title, instructions);
                const newTitle = response.data;
                
                titles.push(newTitle);
                renderTitlesList();
                
                // Select the new title
                selectTitle(newTitle);
                
                // Now generate paintings
                await generatePaintingsForTitle(newTitle.id, quantity);
                
                // Clear inputs after successful generation
                titleInput.value = '';
                customInstructions.value = '';
                
        } catch (error) {
                console.error('Error creating title and generating paintings:', error);
                alert(error.response?.data?.error || 'Failed to create title and generate paintings');
            } finally {
                showLoading(false);
            }
        } else {
            // Use the selected title
            await generatePaintingsForTitle(currentTitle.id, quantity);
        }
    });
    
    // More paintings button
    moreThumbnailsBtn.addEventListener('click', async () => {
        if (!currentTitle) return;
        
        const quantity = parseInt(quantitySelect.value) || 3;
        await generatePaintingsForTitle(currentTitle.id, quantity);
    });
    
    // Refresh paintings button
    refreshPaintingsBtn.addEventListener('click', async () => {
        if (!currentTitle) {
            alert('Please select a title first');
        return;
    }
    
        await loadPaintings(currentTitle.id);
    });
    
    // Reference toggle
    globalReferenceToggle.addEventListener('change', () => {
        const useGlobalRefs = globalReferenceToggle.checked;
        globalReferencesSection.style.display = useGlobalRefs ? 'block' : 'none';
        titleReferencesSection.style.display = useGlobalRefs ? 'none' : 'block';
        
        if (!useGlobalRefs && currentTitle) {
            renderReferenceImages(currentTitle.references, titleReferenceImages);
        }
    });
    
    // File uploads
    globalUploadBtn.addEventListener('click', () => globalFileInput.click());
    titleUploadBtn.addEventListener('click', () => titleFileInput.click());
    
    globalFileInput.addEventListener('change', (e) => {
        handleFileUpload(e, globalReferences, globalReferenceImages, true);
    });
    
    titleFileInput.addEventListener('change', (e) => {
        handleFileUpload(e, currentTitle?.references || [], titleReferenceImages, false);
    });
    
    // Modal close
    closeModal.addEventListener('click', () => {
        promptModal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === promptModal) {
            promptModal.style.display = 'none';
        }
    });
}

// Create new title
async function createNewTitle(title, instructions) {
    try {
        showLoading(true);
        const response = await createTitle(title, instructions);
        const newTitle = response.data;
        
        titles.push(newTitle);
        renderTitlesList();
        
        // Clear inputs
        titleInput.value = '';
        customInstructions.value = '';
        
        // Select the new title
        selectTitle(newTitle);
    } catch (error) {
        console.error('Error creating title:', error);
        alert(error.response?.data?.error || 'Failed to create title');
    } finally {
        showLoading(false);
    }
}

// Generate paintings for a title
async function generatePaintingsForTitle(titleId, quantity) {
    try {
        showLoading(true);
        
        // Upload any new title-specific references if needed
        if (!globalReferenceToggle.checked && currentTitle?.references) {
            for (const ref of currentTitle.references) {
                if (!ref.id) {
                    await uploadReference(currentTitle.id, ref.data, false);
                }
            }
        }
        
        // Start generation
        await generatePaintings(titleId, quantity);
        
        // Refresh titles list
        const titlesResponse = await getTitles();
        titles = titlesResponse.data.titles;
        renderTitlesList();
        
    } catch (error) {
        console.error('Error generating paintings:', error);
        
        let errorMessage = 'Failed to generate paintings';
        
        if (error.code === 'ECONNABORTED') {
            errorMessage = 'Request timed out. The server is still processing your request in the background. You can check the status by refreshing the page or clicking on the title.';
        } else if (error.response?.data?.error) {
            errorMessage = error.response.data.error;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        alert(errorMessage);
    } finally {
        showLoading(false);
    }
}

// Select a title
function selectTitle(title) {
    currentTitle = title;
    
    // Update UI to show selected title
    document.querySelectorAll('.title-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const titleElement = document.querySelector(`[data-title-id="${title.id}"]`);
    if (titleElement) {
        titleElement.classList.add('selected');
    }
    
    // Load paintings for this title
    loadPaintings(title.id);
    
    // Show title-specific references if not using global
    if (!globalReferenceToggle.checked) {
        renderReferenceImages(title.references || [], titleReferenceImages);
    }
}

// Render titles list
function renderTitlesList() {
    if (titles.length === 0) {
        titleList.innerHTML = '<div class="empty-state">No titles yet. Create your first one!</div>';
        return;
    }
    
    titleList.innerHTML = '';
    titles.forEach(title => {
        const titleElement = document.createElement('div');
        titleElement.className = 'title-item';
        titleElement.setAttribute('data-title-id', title.id);
        titleElement.innerHTML = `
            <div class="title-text">${title.title}</div>
            <div class="title-actions">
                <button class="btn small-btn edit-title" onclick="editTitle(${title.id})">Edit</button>
                <button class="btn small-btn delete-title" onclick="deleteTitleById(${title.id})">Delete</button>
            </div>
        `;
        
        titleElement.addEventListener('click', (e) => {
            if (!e.target.classList.contains('edit-title') && !e.target.classList.contains('delete-title')) {
                selectTitle(title);
            }
        });
        
        titleList.appendChild(titleElement);
    });
}

// Render reference images
function renderReferenceImages(references, container) {
    container.innerHTML = '';
    
    if (references.length === 0) {
        container.innerHTML = '<div class="empty-state">No reference images</div>';
        return;
    }
    
    references.forEach((ref, index) => {
        const imgElement = document.createElement('div');
        imgElement.className = 'reference-image';
        imgElement.innerHTML = `
            <img src="${ref.data}" alt="Reference ${index + 1}">
            <button class="remove-reference" onclick="removeReference(${ref.id || index})">×</button>
        `;
        container.appendChild(imgElement);
    });
}

// Handle file upload
function handleFileUpload(event, referencesArray, container, isGlobal) {
    const files = event.target.files;
    
    for (const file of files) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = e.target.result;
                const newRef = {
                    id: null, // Will be set after upload
                    data: imageData
                };
                
                referencesArray.push(newRef);
                renderReferenceImages(referencesArray, container);
                
                // Upload to server if user is logged in
                if (currentUser && currentTitle) {
                    uploadReference(currentTitle.id, imageData, isGlobal);
                }
            };
            reader.readAsDataURL(file);
        }
    }
    
    // Clear the input
    event.target.value = '';
}

// Edit title
function editTitle(titleId) {
    const title = titles.find(t => t.id === titleId);
    if (!title) return;
    
    titleInput.value = title.title;
    customInstructions.value = title.instructions || '';
    
    // Scroll to input section
    document.querySelector('.title-input-section').scrollIntoView({ behavior: 'smooth' });
}

// Delete title
async function deleteTitleById(titleId) {
    if (!confirm('Are you sure you want to delete this title?')) return;
    
    try {
        await deleteTitle(titleId);
        titles = titles.filter(t => t.id !== titleId);
        renderTitlesList();
        
        if (currentTitle && currentTitle.id === titleId) {
    currentTitle = null;
    thumbnailsGrid.innerHTML = '';
    thumbnailsEmptyState.style.display = 'block';
        }
    } catch (error) {
        console.error('Error deleting title:', error);
        alert('Failed to delete title');
    }
}

// Remove reference
function removeReference(refId) {
    // Implementation depends on how references are stored
    // For now, just remove from the UI
    console.log('Remove reference:', refId);
}

// Make functions globally available
window.showPromptDetails = showPromptDetails;
window.editTitle = editTitle;
window.deleteTitleById = deleteTitleById;
window.removeReference = removeReference;

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', init); 