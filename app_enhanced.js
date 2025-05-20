/**
 * 工业油漆数据库 - 前端应用
 * 纯JavaScript实现，无需后端服务器
 * 增强版：添加自动计算功能
 */

// 全局变量
const DB_NAME = 'paintDatabase';
const DB_VERSION = '1.1';
let paintProducts = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentSort = { field: 'name', direction: 'asc' };
let editingProductId = null;

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', function() {
    // 初始化数据
    loadData();
    
    // 设置导航事件
    setupNavigation();
    
    // 设置表单事件
    setupFormEvents();
    
    // 设置搜索和排序事件
    setupSearchAndSort();
    
    // 设置导入导出事件
    setupImportExport();
    
    // 设置产品详情模态框事件
    setupProductDetailModal();
});

// 加载数据
function loadData() {
    const storedData = localStorage.getItem(DB_NAME);
    if (storedData) {
        try {
            const data = JSON.parse(storedData);
            paintProducts = data.products || [];
            
            // 检查数据版本，如果需要升级数据结构
            if (data.version !== DB_VERSION) {
                upgradeDataStructure();
            }
        } catch (e) {
            console.error('加载数据失败:', e);
            showToast('加载数据失败，将使用空数据库开始。', 'error');
            paintProducts = [];
        }
    } else {
        paintProducts = [];
    }
    
    // 显示产品列表
    renderProductList();
}

// 升级数据结构（如果需要）
function upgradeDataStructure() {
    // 为旧数据添加新字段
    paintProducts.forEach(product => {
        // 确保所有必要字段存在
        product.filmThickness = product.filmThickness || 0;
        product.solidContent = product.solidContent || 0;
        product.density = product.density || 0;
        product.lossFactor = product.lossFactor || 1;
        product.totalArea = product.totalArea || 0;
        
        // 重新计算所有自动计算字段
        updateCalculatedFields(product);
    });
    
    // 保存升级后的数据
    saveData();
    
    showToast('数据库已升级到新版本。', 'info');
}

// 保存数据到本地存储
function saveData() {
    const data = {
        products: paintProducts,
        lastUpdated: new Date().toISOString(),
        version: DB_VERSION
    };
    
    localStorage.setItem(DB_NAME, JSON.stringify(data));
}

// 设置导航事件
function setupNavigation() {
    // 导航链接点击事件
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetPage = this.getAttribute('data-page');
            showPage(targetPage);
        });
    });
    
    // "添加第一个产品"按钮点击事件
    document.getElementById('add-first-product-btn').addEventListener('click', function() {
        showPage('add-product');
    });
    
    // 取消按钮点击事件
    document.getElementById('cancel-button').addEventListener('click', function() {
        showPage('database');
    });
}

// 显示指定页面
function showPage(pageId) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 显示目标页面
    document.getElementById(pageId + '-page').classList.add('active');
    
    // 更新导航栏活动项
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageId) {
            link.classList.add('active');
        }
    });
    
    // 如果是添加产品页面，重置表单
    if (pageId === 'add-product') {
        resetProductForm();
    }
}

// 设置表单事件
function setupFormEvents() {
    // 产品表单提交事件
    document.getElementById('product-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveProduct();
    });
    
    // 设置核心参数输入事件，实现自动计算
    setupAutoCalculation();
}

// 设置自动计算事件
function setupAutoCalculation() {
    // 获取所有核心参数输入框
    const coreInputs = document.querySelectorAll('.core-param');
    
    // 为每个核心参数添加输入事件
    coreInputs.forEach(input => {
        input.addEventListener('input', function() {
            calculateFormValues();
        });
    });
    
    // 详情模态框中的计算器输入事件
    document.getElementById('detail-calc-area').addEventListener('input', updateDetailCalculator);
    document.getElementById('detail-calc-loss-factor').addEventListener('input', updateDetailCalculator);
}

// 计算表单中的值
function calculateFormValues() {
    // 获取核心参数值
    const filmThickness = parseFloat(document.getElementById('product-film-thickness').value) || 0;
    const solidContent = parseFloat(document.getElementById('product-solid-content').value) || 0;
    const density = parseFloat(document.getElementById('product-density').value) || 0;
    const lossFactor = parseFloat(document.getElementById('product-loss-factor').value) || 1;
    const totalArea = parseFloat(document.getElementById('product-total-area').value) || 0;
    const pricePerL = parseFloat(document.getElementById('product-price-per-l').value) || 0;
    
    // 计算理论材料耗量(㎡/L)
    let theoreticalCoverageL = 0;
    if (filmThickness > 0 && solidContent > 0) {
        theoreticalCoverageL = (solidContent * 10) / filmThickness;
    }
    
    // 计算理论材料耗量(㎡/kg)
    let theoreticalCoverageKg = 0;
    if (density > 0) {
        theoreticalCoverageKg = theoreticalCoverageL / density;
    }
    
    // 计算实际材料耗量(㎡/L)
    const actualCoverageL = theoreticalCoverageL / lossFactor;
    
    // 计算实际材料耗量(㎡/kg)
    const actualCoverageKg = theoreticalCoverageKg / lossFactor;
    
    // 计算涂装用量(L)
    let totalVolumeL = 0;
    if (actualCoverageL > 0) {
        totalVolumeL = totalArea / actualCoverageL;
    }
    
    // 计算涂装用量(kg)
    let totalWeightKg = 0;
    if (actualCoverageKg > 0) {
        totalWeightKg = totalArea / actualCoverageKg;
    }
    
    // 计算总成本(元)
    const totalCost = totalVolumeL * pricePerL;
    
    // 计算单位价格(元/㎡)
    let pricePerSqm = 0;
    if (actualCoverageL > 0) {
        pricePerSqm = pricePerL / actualCoverageL;
    }
    
    // 更新表单中的自动计算字段
    document.getElementById('product-theoretical-coverage-l').value = formatNumber(theoreticalCoverageL);
    document.getElementById('product-theoretical-coverage-kg').value = formatNumber(theoreticalCoverageKg);
    document.getElementById('product-actual-coverage-l').value = formatNumber(actualCoverageL);
    document.getElementById('product-actual-coverage-kg').value = formatNumber(actualCoverageKg);
    document.getElementById('product-total-volume-l').value = formatNumber(totalVolumeL);
    document.getElementById('product-total-weight-kg').value = formatNumber(totalWeightKg);
    document.getElementById('product-total-cost').value = formatNumber(totalCost);
    document.getElementById('product-price-per-sqm').value = formatNumber(pricePerSqm);
}

// 更新产品对象中的计算字段
function updateCalculatedFields(product) {
    // 计算理论材料耗量(㎡/L)
    if (product.filmThickness > 0 && product.solidContent > 0) {
        product.theoreticalCoverageL = (product.solidContent * 10) / product.filmThickness;
    } else {
        product.theoreticalCoverageL = 0;
    }
    
    // 计算理论材料耗量(㎡/kg)
    if (product.density > 0) {
        product.theoreticalCoverageKg = product.theoreticalCoverageL / product.density;
    } else {
        product.theoreticalCoverageKg = 0;
    }
    
    // 计算实际材料耗量(㎡/L)
    product.actualCoverageL = product.theoreticalCoverageL / product.lossFactor;
    
    // 计算实际材料耗量(㎡/kg)
    product.actualCoverageKg = product.theoreticalCoverageKg / product.lossFactor;
    
    // 计算涂装用量(L)
    if (product.actualCoverageL > 0) {
        product.totalVolumeL = product.totalArea / product.actualCoverageL;
    } else {
        product.totalVolumeL = 0;
    }
    
    // 计算涂装用量(kg)
    if (product.actualCoverageKg > 0) {
        product.totalWeightKg = product.totalArea / product.actualCoverageKg;
    } else {
        product.totalWeightKg = 0;
    }
    
    // 计算单位价格(元/kg)
    if (product.density > 0) {
        product.pricePerKg = product.pricePerL * product.density;
    } else {
        product.pricePerKg = 0;
    }
    
    // 计算单位价格(元/㎡)
    if (product.actualCoverageL > 0) {
        product.pricePerSqm = product.pricePerL / product.actualCoverageL;
    } else {
        product.pricePerSqm = 0;
    }
    
    // 计算总成本(元)
    product.totalCost = product.totalVolumeL * product.pricePerL;
    
    return product;
}

// 重置产品表单
function resetProductForm() {
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('form-title').textContent = '添加新产品';
    editingProductId = null;
    
    // 重置自动计算字段
    document.getElementById('product-theoretical-coverage-l').value = '';
    document.getElementById('product-theoretical-coverage-kg').value = '';
    document.getElementById('product-actual-coverage-l').value = '';
    document.getElementById('product-actual-coverage-kg').value = '';
    document.getElementById('product-total-volume-l').value = '';
    document.getElementById('product-total-weight-kg').value = '';
    document.getElementById('product-total-cost').value = '';
    document.getElementById('product-price-per-sqm').value = '';
    
    // 设置默认值
    document.getElementById('product-loss-factor').value = '1';
}

// 保存产品
function saveProduct() {
    // 验证表单
    if (!validateProductForm()) {
        return;
    }
    
    // 获取表单数据
    const productData = getProductFormData();
    
    // 如果是编辑现有产品
    if (editingProductId) {
        const index = paintProducts.findIndex(p => p.id === editingProductId);
        if (index !== -1) {
            productData.id = editingProductId;
            paintProducts[index] = productData;
            showToast('产品已更新。', 'success');
        }
    } else {
        // 添加新产品
        productData.id = generateUniqueId();
        paintProducts.push(productData);
        showToast('产品已添加。', 'success');
    }
    
    // 保存数据
    saveData();
    
    // 返回数据库页面并刷新列表
    showPage('database');
    renderProductList();
}

// 验证产品表单
function validateProductForm() {
    let isValid = true;
    
    // 验证产品名称
    const nameInput = document.getElementById('product-name');
    if (!nameInput.value.trim()) {
        nameInput.classList.add('is-invalid');
        isValid = false;
    } else {
        nameInput.classList.remove('is-invalid');
    }
    
    // 验证固体含量
    const solidContentInput = document.getElementById('product-solid-content');
    const solidContent = parseFloat(solidContentInput.value);
    if (isNaN(solidContent) || solidContent < 0 || solidContent > 100) {
        solidContentInput.classList.add('is-invalid');
        isValid = false;
    } else {
        solidContentInput.classList.remove('is-invalid');
    }
    
    // 验证比重
    const densityInput = document.getElementById('product-density');
    const density = parseFloat(densityInput.value);
    if (isNaN(density) || density <= 0) {
        densityInput.classList.add('is-invalid');
        isValid = false;
    } else {
        densityInput.classList.remove('is-invalid');
    }
    
    // 验证损耗系数
    const lossFactorInput = document.getElementById('product-loss-factor');
    const lossFactor = parseFloat(lossFactorInput.value);
    if (isNaN(lossFactor) || lossFactor < 1) {
        lossFactorInput.classList.add('is-invalid');
        isValid = false;
    } else {
        lossFactorInput.classList.remove('is-invalid');
    }
    
    return isValid;
}

// 获取表单数据
function getProductFormData() {
    const product = {
        name: document.getElementById('product-name').value.trim(),
        brand: document.getElementById('product-brand').value.trim(),
        type: document.getElementById('product-type').value,
        color: document.getElementById('product-color').value.trim(),
        filmThickness: parseFloat(document.getElementById('product-film-thickness').value) || 0,
        solidContent: parseFloat(document.getElementById('product-solid-content').value) || 0,
        density: parseFloat(document.getElementById('product-density').value) || 0,
        coatCount: parseInt(document.getElementById('product-coat-count').value) || 1,
        applicationMethod: document.getElementById('product-application-method').value,
        lossFactor: parseFloat(document.getElementById('product-loss-factor').value) || 1,
        pricePerL: parseFloat(document.getElementById('product-price-per-l').value) || 0,
        pricePerKg: parseFloat(document.getElementById('product-price-per-kg').value) || 0,
        totalArea: parseFloat(document.getElementById('product-total-area').value) || 0,
        notes: document.getElementById('product-notes').value.trim(),
        updateDate: new Date().toISOString()
    };
    
    // 更新计算字段
    return updateCalculatedFields(product);
}

// 设置搜索和排序事件
function setupSearchAndSort() {
    // 搜索按钮点击事件
    document.getElementById('search-button').addEventListener('click', function() {
        searchProducts();
    });
    
    // 搜索框回车事件
    document.getElementById('search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchProducts();
        }
    });
    
    // 表头排序点击事件
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', function() {
            const field = this.getAttribute('data-sort');
            sortProducts(field);
        });
    });
}

// 搜索产品
function searchProducts() {
    const searchTerm = document.getElementById('search-input').value.trim().toLowerCase();
    
    if (!searchTerm) {
        renderProductList(paintProducts);
        return;
    }
    
    const results = paintProducts.filter(product => {
        return (
            (product.name && product.name.toLowerCase().includes(searchTerm)) ||
            (product.brand && product.brand.toLowerCase().includes(searchTerm)) ||
            (product.type && product.type.toLowerCase().includes(searchTerm)) ||
            (product.color && product.color.toLowerCase().includes(searchTerm)) ||
            (product.notes && product.notes.toLowerCase().includes(searchTerm))
        );
    });
    
    renderProductList(results);
    showToast(`找到 ${results.length} 个匹配的产品。`, 'info');
}

// 排序产品
function sortProducts(field) {
    // 如果点击的是当前排序字段，则切换排序方向
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }
    
    // 更新排序图标
    updateSortIcons();
    
    // 重新渲染产品列表
    renderProductList();
}

// 更新排序图标
function updateSortIcons() {
    document.querySelectorAll('th[data-sort] .sort-icon').forEach(icon => {
        icon.className = 'bi bi-arrow-down-up sort-icon';
    });
    
    const currentSortTh = document.querySelector(`th[data-sort="${currentSort.field}"]`);
    if (currentSortTh) {
        const icon = currentSortTh.querySelector('.sort-icon');
        if (icon) {
            icon.className = `bi bi-arrow-${currentSort.direction === 'asc' ? 'up' : 'down'} sort-icon`;
        }
    }
}

// 渲染产品列表
function renderProductList(products = null) {
    const productList = document.getElementById('product-list');
    const noDataMessage = document.getElementById('no-data-message');
    
    // 如果没有指定产品列表，则使用全局产品列表并应用排序
    if (!products) {
        products = [...paintProducts];
        
        // 应用排序
        products.sort((a, b) => {
            let valueA = a[currentSort.field];
            let valueB = b[currentSort.field];
            
            // 处理数字和字符串的排序
            if (typeof valueA === 'string') {
                valueA = valueA.toLowerCase();
            }
            if (typeof valueB === 'string') {
                valueB = valueB.toLowerCase();
            }
            
            if (valueA < valueB) {
                return currentSort.direction === 'asc' ? -1 : 1;
            }
            if (valueA > valueB) {
                return currentSort.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }
    
    // 清空产品列表
    productList.innerHTML = '';
    
    // 如果没有产品，显示"暂无数据"消息
    if (products.length === 0) {
        noDataMessage.classList.remove('d-none');
        document.getElementById('showing-records').textContent = '0-0';
        document.getElementById('total-records').textContent = '0';
        document.getElementById('pagination').innerHTML = '';
        return;
    }
    
    // 隐藏"暂无数据"消息
    noDataMessage.classList.add('d-none');
    
    // 计算分页
    const totalPages = Math.ceil(products.length / itemsPerPage);
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, products.length);
    const currentPageProducts = products.slice(startIndex, endIndex);
    
    // 更新显示记录信息
    document.getElementById('showing-records').textContent = `${startIndex + 1}-${endIndex}`;
    document.getElementById('total-records').textContent = products.length;
    
    // 渲染当前页的产品
    currentPageProducts.forEach(product => {
        const row = document.createElement('tr');
        
        // 产品名称
        const nameCell = document.createElement('td');
        nameCell.textContent = product.name;
        row.appendChild(nameCell);
        
        // 品牌
        const brandCell = document.createElement('td');
        brandCell.textContent = product.brand || '';
        row.appendChild(brandCell);
        
        // 类型
        const typeCell = document.createElement('td');
        typeCell.textContent = product.type || '';
        row.appendChild(typeCell);
        
        // 颜色
        const colorCell = document.createElement('td');
        colorCell.textContent = product.color || '';
        row.appendChild(colorCell);
        
        // 固体含量
        const solidContentCell = document.createElement('td');
        solidContentCell.textContent = product.solidContent ? `${product.solidContent}%` : '';
        row.appendChild(solidContentCell);
        
        // 比重
        const densityCell = document.createElement('td');
        densityCell.textContent = product.density || '';
        row.appendChild(densityCell);
        
        // 操作按钮
        const actionsCell = document.createElement('td');
        actionsCell.className = 'text-center';
        
        // 查看按钮
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn btn-sm btn-outline-primary me-1';
        viewBtn.innerHTML = '<i class="bi bi-eye"></i>';
        viewBtn.title = '查看详情';
        viewBtn.addEventListener('click', () => showProductDetail(product.id));
        actionsCell.appendChild(viewBtn);
        
        // 编辑按钮
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-outline-secondary me-1';
        editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
        editBtn.title = '编辑';
        editBtn.addEventListener('click', () => editProduct(product.id));
        actionsCell.appendChild(editBtn);
        
        // 删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-outline-danger';
        deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
        deleteBtn.title = '删除';
        deleteBtn.addEventListener('click', () => confirmDeleteProduct(product.id));
        actionsCell.appendChild(deleteBtn);
        
        row.appendChild(actionsCell);
        
        productList.appendChild(row);
    });
    
    // 渲染分页控件
    renderPagination(products.length, totalPages);
}

// 渲染分页控件
function renderPagination(totalItems, totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    if (totalPages <= 1) {
        return;
    }
    
    // 上一页按钮
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    const prevLink = document.createElement('a');
    prevLink.className = 'page-link';
    prevLink.href = '#';
    prevLink.innerHTML = '&laquo;';
    prevLink.addEventListener('click', function(e) {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            renderProductList();
        }
    });
    prevLi.appendChild(prevLink);
    pagination.appendChild(prevLi);
    
    // 页码按钮
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        const pageLink = document.createElement('a');
        pageLink.className = 'page-link';
        pageLink.href = '#';
        pageLink.textContent = i;
        pageLink.addEventListener('click', function(e) {
            e.preventDefault();
            currentPage = i;
            renderProductList();
        });
        pageLi.appendChild(pageLink);
        pagination.appendChild(pageLi);
    }
    
    // 下一页按钮
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    const nextLink = document.createElement('a');
    nextLink.className = 'page-link';
    nextLink.href = '#';
    nextLink.innerHTML = '&raquo;';
    nextLink.addEventListener('click', function(e) {
        e.preventDefault();
        if (currentPage < totalPages) {
            currentPage++;
            renderProductList();
        }
    });
    nextLi.appendChild(nextLink);
    pagination.appendChild(nextLi);
}

// 显示产品详情
function showProductDetail(productId) {
    const product = paintProducts.find(p => p.id === productId);
    if (!product) return;
    
    // 填充基本信息标签页
    document.getElementById('detail-name').textContent = product.name || '';
    document.getElementById('detail-brand').textContent = product.brand || '';
    document.getElementById('detail-type').textContent = product.type || '';
    document.getElementById('detail-color').textContent = product.color || '';
    document.getElementById('detail-film-thickness').textContent = product.filmThickness || '';
    document.getElementById('detail-solid-content').textContent = product.solidContent ? `${product.solidContent}%` : '';
    document.getElementById('detail-density').textContent = product.density || '';
    document.getElementById('detail-coat-count').textContent = product.coatCount || '';
    document.getElementById('detail-application-method').textContent = product.applicationMethod || '';
    document.getElementById('detail-notes').textContent = product.notes || '';
    
    document.getElementById('detail-theoretical-coverage-l').textContent = formatNumber(product.theoreticalCoverageL);
    document.getElementById('detail-theoretical-coverage-kg').textContent = formatNumber(product.theoreticalCoverageKg);
    document.getElementById('detail-loss-factor').textContent = product.lossFactor || '1';
    document.getElementById('detail-actual-coverage-l').textContent = formatNumber(product.actualCoverageL);
    document.getElementById('detail-actual-coverage-kg').textContent = formatNumber(product.actualCoverageKg);
    document.getElementById('detail-price-per-l').textContent = product.pricePerL || '';
    document.getElementById('detail-price-per-kg').textContent = formatNumber(product.pricePerKg);
    document.getElementById('detail-price-per-sqm').textContent = formatNumber(product.pricePerSqm);
    
    // 格式化日期
    let updateDate = '';
    if (product.updateDate) {
        try {
            const date = new Date(product.updateDate);
            updateDate = date.toLocaleString();
        } catch (e) {
            updateDate = product.updateDate;
        }
    }
    document.getElementById('detail-update-date').textContent = updateDate;
    
    // 设置涂装计算器标签页
    document.getElementById('detail-calc-area').value = product.totalArea || '';
    document.getElementById('detail-calc-loss-factor').value = product.lossFactor || '1';
    
    // 更新计算器结果
    updateDetailCalculator();
    
    // 设置编辑按钮事件
    document.getElementById('detail-edit-btn').onclick = function() {
        editProduct(productId);
        const modal = bootstrap.Modal.getInstance(document.getElementById('product-detail-modal'));
        modal.hide();
    };
    
    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('product-detail-modal'));
    modal.show();
}

// 更新详情模态框中的计算器
function updateDetailCalculator() {
    const productId = document.getElementById('detail-edit-btn').onclick.toString().match(/editProduct\(['"]([^'"]+)['"]\)/)[1];
    const product = paintProducts.find(p => p.id === productId);
    if (!product) return;
    
    const area = parseFloat(document.getElementById('detail-calc-area').value) || 0;
    const lossFactor = parseFloat(document.getElementById('detail-calc-loss-factor').value) || 1;
    
    // 重新计算实际材料耗量
    const actualCoverageL = product.theoreticalCoverageL / lossFactor;
    const actualCoverageKg = product.theoreticalCoverageKg / lossFactor;
    
    // 计算涂装用量
    let volumeL = 0;
    if (actualCoverageL > 0) {
        volumeL = area / actualCoverageL;
    }
    
    let weightKg = 0;
    if (actualCoverageKg > 0) {
        weightKg = area / actualCoverageKg;
    }
    
    // 计算总成本
    const cost = volumeL * (product.pricePerL || 0);
    
    // 更新显示
    document.getElementById('detail-calc-volume-l').textContent = formatNumber(volumeL);
    document.getElementById('detail-calc-weight-kg').textContent = formatNumber(weightKg);
    document.getElementById('detail-calc-cost').textContent = formatNumber(cost);
}

// 编辑产品
function editProduct(productId) {
    const product = paintProducts.find(p => p.id === productId);
    if (!product) return;
    
    // 设置表单标题
    document.getElementById('form-title').textContent = '编辑产品';
    
    // 填充表单数据
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name || '';
    document.getElementById('product-brand').value = product.brand || '';
    document.getElementById('product-type').value = product.type || '';
    document.getElementById('product-color').value = product.color || '';
    document.getElementById('product-film-thickness').value = product.filmThickness || '';
    document.getElementById('product-solid-content').value = product.solidContent || '';
    document.getElementById('product-density').value = product.density || '';
    document.getElementById('product-coat-count').value = product.coatCount || '';
    document.getElementById('product-application-method').value = product.applicationMethod || '';
    document.getElementById('product-loss-factor').value = product.lossFactor || '1';
    document.getElementById('product-price-per-l').value = product.pricePerL || '';
    document.getElementById('product-price-per-kg').value = product.pricePerKg || '';
    document.getElementById('product-total-area').value = product.totalArea || '';
    document.getElementById('product-notes').value = product.notes || '';
    
    // 填充自动计算字段
    document.getElementById('product-theoretical-coverage-l').value = formatNumber(product.theoreticalCoverageL);
    document.getElementById('product-theoretical-coverage-kg').value = formatNumber(product.theoreticalCoverageKg);
    document.getElementById('product-actual-coverage-l').value = formatNumber(product.actualCoverageL);
    document.getElementById('product-actual-coverage-kg').value = formatNumber(product.actualCoverageKg);
    document.getElementById('product-total-volume-l').value = formatNumber(product.totalVolumeL);
    document.getElementById('product-total-weight-kg').value = formatNumber(product.totalWeightKg);
    document.getElementById('product-total-cost').value = formatNumber(product.totalCost);
    document.getElementById('product-price-per-sqm').value = formatNumber(product.pricePerSqm);
    
    // 设置编辑状态
    editingProductId = product.id;
    
    // 显示添加产品页面
    showPage('add-product');
}

// 确认删除产品
function confirmDeleteProduct(productId) {
    const product = paintProducts.find(p => p.id === productId);
    if (!product) return;
    
    // 设置产品名称
    document.getElementById('delete-product-name').textContent = product.name;
    
    // 设置确认按钮事件
    document.getElementById('confirm-delete-btn').onclick = function() {
        deleteProduct(productId);
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirm-delete-modal'));
        modal.hide();
    };
    
    // 显示确认模态框
    const modal = new bootstrap.Modal(document.getElementById('confirm-delete-modal'));
    modal.show();
}

// 删除产品
function deleteProduct(productId) {
    const index = paintProducts.findIndex(p => p.id === productId);
    if (index !== -1) {
        paintProducts.splice(index, 1);
        saveData();
        renderProductList();
        showToast('产品已删除。', 'success');
    }
}

// 设置导入导出事件
function setupImportExport() {
    // 导出JSON按钮点击事件
    document.getElementById('export-json-btn').addEventListener('click', exportJSON);
    
    // 导出CSV按钮点击事件
    document.getElementById('export-csv-btn').addEventListener('click', exportCSV);
    
    // 导入文件选择事件
    document.getElementById('import-file').addEventListener('change', function() {
        document.getElementById('import-btn').disabled = !this.files.length;
    });
    
    // 导入按钮点击事件
    document.getElementById('import-btn').addEventListener('click', importData);
    
    // 下载JSON示例按钮点击事件
    document.getElementById('download-json-sample').addEventListener('click', downloadJSONSample);
    
    // 下载CSV示例按钮点击事件
    document.getElementById('download-csv-sample').addEventListener('click', downloadCSVSample);
}

// 导出JSON
function exportJSON() {
    const data = {
        products: paintProducts,
        exportDate: new Date().toISOString(),
        version: DB_VERSION
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `工业油漆数据库_${formatDateForFilename()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('数据已导出为JSON文件。', 'success');
}

// 导出CSV
function exportCSV() {
    // CSV表头
    const headers = [
        '产品名称', '品牌', '类型', '颜色', '干膜厚度(μm)', '固体含量(%)', 
        '比重', '涂刷道数', '施工方式', '损耗系数', '理论材料耗量(㎡/L)', 
        '理论材料耗量(㎡/kg)', '实际材料耗量(㎡/L)', '实际材料耗量(㎡/kg)', 
        '涂装总面积(㎡)', '涂装用量(L)', '涂装用量(kg)', '单位价格(元/L)', 
        '单位价格(元/kg)', '单位价格(元/㎡)', '总成本(元)', '备注', '更新日期'
    ];
    
    // 转换数据为CSV行
    const rows = paintProducts.map(product => {
        return [
            escapeCsvValue(product.name),
            escapeCsvValue(product.brand),
            escapeCsvValue(product.type),
            escapeCsvValue(product.color),
            product.filmThickness,
            product.solidContent,
            product.density,
            product.coatCount,
            escapeCsvValue(product.applicationMethod),
            product.lossFactor,
            product.theoreticalCoverageL,
            product.theoreticalCoverageKg,
            product.actualCoverageL,
            product.actualCoverageKg,
            product.totalArea,
            product.totalVolumeL,
            product.totalWeightKg,
            product.pricePerL,
            product.pricePerKg,
            product.pricePerSqm,
            product.totalCost,
            escapeCsvValue(product.notes),
            product.updateDate
        ].join(',');
    });
    
    // 组合CSV内容
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // 创建下载链接
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `工业油漆数据库_${formatDateForFilename()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('数据已导出为CSV文件。', 'success');
}

// 导入数据
function importData() {
    const fileInput = document.getElementById('import-file');
    const replaceData = document.getElementById('replace-data').checked;
    
    if (!fileInput.files.length) {
        showToast('请选择要导入的文件。', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    // 显示进度条
    const progressContainer = document.getElementById('import-progress-container');
    const progressBar = document.getElementById('import-progress-bar');
    const statusText = document.getElementById('import-status');
    
    progressContainer.classList.remove('d-none');
    progressBar.style.width = '0%';
    statusText.textContent = '正在读取文件...';
    
    reader.onload = function(e) {
        try {
            let importedProducts = [];
            
            // 根据文件类型处理数据
            if (file.name.endsWith('.json')) {
                // 处理JSON文件
                const data = JSON.parse(e.target.result);
                importedProducts = data.products || [];
                
                // 验证数据结构
                if (!Array.isArray(importedProducts)) {
                    throw new Error('无效的JSON格式，找不到产品数组。');
                }
            } else if (file.name.endsWith('.csv')) {
                // 处理CSV文件
                importedProducts = parseCSV(e.target.result);
            } else {
                throw new Error('不支持的文件格式，请使用JSON或CSV文件。');
            }
            
            // 更新进度
            progressBar.style.width = '50%';
            statusText.textContent = `已读取 ${importedProducts.length} 个产品，正在处理...`;
            
            // 处理导入的产品
            setTimeout(() => {
                processImportedProducts(importedProducts, replaceData);
                
                // 完成导入
                progressBar.style.width = '100%';
                statusText.textContent = `成功导入 ${importedProducts.length} 个产品。`;
                
                // 重置文件输入
                fileInput.value = '';
                document.getElementById('import-btn').disabled = true;
                
                // 3秒后隐藏进度条
                setTimeout(() => {
                    progressContainer.classList.add('d-none');
                }, 3000);
            }, 500);
        } catch (error) {
            console.error('导入数据失败:', error);
            progressBar.style.width = '100%';
            progressBar.className = 'progress-bar bg-danger';
            statusText.textContent = `导入失败: ${error.message}`;
            
            showToast(`导入失败: ${error.message}`, 'error');
        }
    };
    
    reader.onerror = function() {
        progressBar.style.width = '100%';
        progressBar.className = 'progress-bar bg-danger';
        statusText.textContent = '读取文件失败。';
        
        showToast('读取文件失败。', 'error');
    };
    
    // 读取文件
    if (file.name.endsWith('.json')) {
        reader.readAsText(file);
    } else if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
    } else {
        showToast('不支持的文件格式，请使用JSON或CSV文件。', 'error');
    }
}

// 处理导入的产品
function processImportedProducts(importedProducts, replaceData) {
    // 为导入的产品生成ID并更新计算字段
    importedProducts = importedProducts.map(product => {
        // 确保产品有ID
        if (!product.id) {
            product.id = generateUniqueId();
        }
        
        // 确保所有必要字段存在
        product.filmThickness = product.filmThickness || 0;
        product.solidContent = product.solidContent || 0;
        product.density = product.density || 0;
        product.lossFactor = product.lossFactor || 1;
        product.totalArea = product.totalArea || 0;
        
        // 更新计算字段
        return updateCalculatedFields(product);
    });
    
    // 替换或追加数据
    if (replaceData) {
        paintProducts = importedProducts;
        showToast(`已替换所有数据，共 ${importedProducts.length} 个产品。`, 'success');
    } else {
        // 追加数据，避免重复
        const existingIds = new Set(paintProducts.map(p => p.id));
        const newProducts = importedProducts.filter(p => !existingIds.has(p.id));
        
        paintProducts = [...paintProducts, ...newProducts];
        showToast(`已添加 ${newProducts.length} 个新产品。`, 'success');
    }
    
    // 保存数据并刷新列表
    saveData();
    renderProductList();
}

// 解析CSV数据
function parseCSV(csvText) {
    // 分割行
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) {
        throw new Error('CSV文件格式无效或为空。');
    }
    
    // 获取表头
    const headers = lines[0].split(',');
    
    // 解析数据行
    const products = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = parseCSVLine(lines[i]);
        if (values.length !== headers.length) {
            console.warn(`第 ${i + 1} 行的列数与表头不匹配，已跳过。`);
            continue;
        }
        
        const product = {};
        
        // 映射CSV列到产品属性
        product.name = values[0];
        product.brand = values[1];
        product.type = values[2];
        product.color = values[3];
        product.filmThickness = parseFloat(values[4]) || 0;
        product.solidContent = parseFloat(values[5]) || 0;
        product.density = parseFloat(values[6]) || 0;
        product.coatCount = parseInt(values[7]) || 1;
        product.applicationMethod = values[8];
        product.lossFactor = parseFloat(values[9]) || 1;
        product.theoreticalCoverageL = parseFloat(values[10]) || 0;
        product.theoreticalCoverageKg = parseFloat(values[11]) || 0;
        product.actualCoverageL = parseFloat(values[12]) || 0;
        product.actualCoverageKg = parseFloat(values[13]) || 0;
        product.totalArea = parseFloat(values[14]) || 0;
        product.totalVolumeL = parseFloat(values[15]) || 0;
        product.totalWeightKg = parseFloat(values[16]) || 0;
        product.pricePerL = parseFloat(values[17]) || 0;
        product.pricePerKg = parseFloat(values[18]) || 0;
        product.pricePerSqm = parseFloat(values[19]) || 0;
        product.totalCost = parseFloat(values[20]) || 0;
        product.notes = values[21];
        product.updateDate = values[22] || new Date().toISOString();
        
        products.push(product);
    }
    
    return products;
}

// 解析CSV行，处理引号内的逗号
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

// 下载JSON示例
function downloadJSONSample() {
    const sampleProducts = [
        {
            "id": "sample1",
            "name": "环氧富锌底漆",
            "brand": "佐敦",
            "type": "底漆",
            "color": "灰色",
            "filmThickness": 75,
            "solidContent": 65,
            "density": 2.1,
            "coatCount": 1,
            "applicationMethod": "无气喷涂",
            "lossFactor": 1.3,
            "pricePerL": 120,
            "totalArea": 100,
            "notes": "适用于海洋环境",
            "updateDate": new Date().toISOString()
        },
        {
            "id": "sample2",
            "name": "环氧云铁中间漆",
            "brand": "国际",
            "type": "中间漆",
            "color": "红色",
            "filmThickness": 100,
            "solidContent": 70,
            "density": 1.8,
            "coatCount": 1,
            "applicationMethod": "无气喷涂",
            "lossFactor": 1.2,
            "pricePerL": 100,
            "totalArea": 100,
            "notes": "良好的防腐性能",
            "updateDate": new Date().toISOString()
        }
    ];
    
    // 更新计算字段
    sampleProducts.forEach(product => updateCalculatedFields(product));
    
    const data = {
        products: sampleProducts,
        exportDate: new Date().toISOString(),
        version: DB_VERSION
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = '工业油漆数据库_示例.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 下载CSV示例
function downloadCSVSample() {
    const sampleProducts = [
        {
            "name": "环氧富锌底漆",
            "brand": "佐敦",
            "type": "底漆",
            "color": "灰色",
            "filmThickness": 75,
            "solidContent": 65,
            "density": 2.1,
            "coatCount": 1,
            "applicationMethod": "无气喷涂",
            "lossFactor": 1.3,
            "pricePerL": 120,
            "totalArea": 100,
            "notes": "适用于海洋环境",
            "updateDate": new Date().toISOString()
        },
        {
            "name": "环氧云铁中间漆",
            "brand": "国际",
            "type": "中间漆",
            "color": "红色",
            "filmThickness": 100,
            "solidContent": 70,
            "density": 1.8,
            "coatCount": 1,
            "applicationMethod": "无气喷涂",
            "lossFactor": 1.2,
            "pricePerL": 100,
            "totalArea": 100,
            "notes": "良好的防腐性能",
            "updateDate": new Date().toISOString()
        }
    ];
    
    // 更新计算字段
    sampleProducts.forEach(product => updateCalculatedFields(product));
    
    // CSV表头
    const headers = [
        '产品名称', '品牌', '类型', '颜色', '干膜厚度(μm)', '固体含量(%)', 
        '比重', '涂刷道数', '施工方式', '损耗系数', '理论材料耗量(㎡/L)', 
        '理论材料耗量(㎡/kg)', '实际材料耗量(㎡/L)', '实际材料耗量(㎡/kg)', 
        '涂装总面积(㎡)', '涂装用量(L)', '涂装用量(kg)', '单位价格(元/L)', 
        '单位价格(元/kg)', '单位价格(元/㎡)', '总成本(元)', '备注', '更新日期'
    ];
    
    // 转换数据为CSV行
    const rows = sampleProducts.map(product => {
        return [
            escapeCsvValue(product.name),
            escapeCsvValue(product.brand),
            escapeCsvValue(product.type),
            escapeCsvValue(product.color),
            product.filmThickness,
            product.solidContent,
            product.density,
            product.coatCount,
            escapeCsvValue(product.applicationMethod),
            product.lossFactor,
            product.theoreticalCoverageL,
            product.theoreticalCoverageKg,
            product.actualCoverageL,
            product.actualCoverageKg,
            product.totalArea,
            product.totalVolumeL,
            product.totalWeightKg,
            product.pricePerL,
            product.pricePerKg,
            product.pricePerSqm,
            product.totalCost,
            escapeCsvValue(product.notes),
            product.updateDate
        ].join(',');
    });
    
    // 组合CSV内容
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // 创建下载链接
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = '工业油漆数据库_示例.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 设置产品详情模态框事件
function setupProductDetailModal() {
    // 标签页切换事件
    document.getElementById('calculator-tab').addEventListener('click', function() {
        // 确保计算器初始化
        setTimeout(updateDetailCalculator, 100);
    });
}

// 工具函数：生成唯一ID
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// 工具函数：格式化数字，保留2位小数
function formatNumber(value) {
    if (value === undefined || value === null || isNaN(value)) {
        return '';
    }
    return parseFloat(value).toFixed(2);
}

// 工具函数：格式化日期用于文件名
function formatDateForFilename() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}${month}${day}_${hour}${minute}`;
}

// 工具函数：转义CSV值
function escapeCsvValue(value) {
    if (value === undefined || value === null) {
        return '';
    }
    
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

// 显示提示消息
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    
    const toastElement = document.createElement('div');
    toastElement.className = `toast ${type} show`;
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');
    toastElement.setAttribute('aria-atomic', 'true');
    
    const toastHeader = document.createElement('div');
    toastHeader.className = 'toast-header';
    
    let icon = '';
    let title = '';
    
    switch (type) {
        case 'success':
            icon = '<i class="bi bi-check-circle-fill text-success me-2"></i>';
            title = '成功';
            break;
        case 'error':
            icon = '<i class="bi bi-exclamation-circle-fill text-danger me-2"></i>';
            title = '错误';
            break;
        case 'warning':
            icon = '<i class="bi bi-exclamation-triangle-fill text-warning me-2"></i>';
            title = '警告';
            break;
        default:
            icon = '<i class="bi bi-info-circle-fill text-primary me-2"></i>';
            title = '提示';
    }
    
    toastHeader.innerHTML = `
        ${icon}
        <strong class="me-auto">${title}</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    `;
    
    const toastBody = document.createElement('div');
    toastBody.className = 'toast-body';
    toastBody.textContent = message;
    
    toastElement.appendChild(toastHeader);
    toastElement.appendChild(toastBody);
    
    toastContainer.appendChild(toastElement);
    
    // 3秒后自动关闭
    setTimeout(() => {
        toastElement.classList.remove('show');
        setTimeout(() => {
            toastContainer.removeChild(toastElement);
        }, 500);
    }, 3000);
}
